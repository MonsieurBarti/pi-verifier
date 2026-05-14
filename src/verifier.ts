// ---------------------------------------------------------------------------
// Verifier daemon — process entry point
//
// This module is spawned as a child process by verifier-spawn.ts. It runs
// independently with its own AgentSession and communicates with the builder
// over TCP loopback via JSON Lines.
//
// Lifecycle alignment with the builder (Disler-style):
//   - The builder broadcasts a "start" event before each genuine user turn.
//   - The builder broadcasts a "stop" event after EVERY turn_end (genuine and
//     injected corrective turns).
//   - We verify ALL stop events. Injected corrective turns are verified too;
//     this catches regressions introduced by fixes.
//   - Loop protection lives on the builder side: verificationAttempts only
//     resets on genuine user turns. After maxVerificationAttempts, escalation
//     pauses further feedback injection.
// ---------------------------------------------------------------------------

import { createConnection } from "node:net";
import { createInterface } from "node:readline";
import { createAgentSession, type AgentSession } from "@earendil-works/pi-coding-agent";
import { loadPersona, loadPrompt } from "./prompt-loader.js";
import {
  isAssistantMessage,
  isIpcMessage,
  isStartPayload,
  isStopPayload,
  toJsonl,
  type IpcMessage,
  type IpcPayload,
  type TurnEndEvent,
} from "./types.js";

const PORT = Number(process.env.PI_VERIFIER_PORT) || 9876;
const HOST = "127.0.0.1";

const sessionHistory: TurnEndEvent[] = [];
const MAX_HISTORY = 10;

const recentUserPrompts: string[] = [];
const MAX_PROMPTS = 5;

const client = createConnection({ port: PORT, host: HOST });
const rl = createInterface({ input: client });

let session: AgentSession | undefined;
let isAnalyzing = false;

rl.on("line", (line) => {
  try {
    const parsed = JSON.parse(line);
    if (isIpcMessage(parsed)) {
      handleMessage(parsed.data);
    }
  } catch {
    // ignore malformed lines
  }
});

client.on("connect", () => {
  // eslint-disable-next-line no-console
  console.log("[verifier] Connected to builder");
});

client.on("close", () => {
  // eslint-disable-next-line no-console
  console.log("[verifier] Disconnected, exiting");
  process.exit(0);
});

async function initSession(): Promise<void> {
  const { session: createdSession } = await createAgentSession({
    noTools: "all",
    tools: ["read", "grep", "find", "ls"],
  });
  session = createdSession;
  // eslint-disable-next-line no-console
  console.log("[verifier] AgentSession created with read-only tools");
  // eslint-disable-next-line no-console
  console.log("[verifier] Active tools:", session.getActiveToolNames().join(", "));
}

try {
  await initSession();
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.error(
    "[verifier] Failed to create session:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

async function handleTurnEnd(
  event: TurnEndEvent,
  turnIndex: number,
  userPrompt?: string,
): Promise<void> {
  if (!session || isAnalyzing) return;

  isAnalyzing = true;
  try {
    await doHandleTurnEnd(event, turnIndex, userPrompt);
  } finally {
    isAnalyzing = false;
  }
}

async function doHandleTurnEnd(
  event: TurnEndEvent,
  turnIndex: number,
  userPrompt?: string,
): Promise<void> {
  if (!session) return;

  sessionHistory.push(event);
  if (sessionHistory.length > MAX_HISTORY) {
    sessionHistory.shift();
  }

  const persona = loadPersona();
  const stopTemplate = loadPrompt("verify_on_stop");

  const hasErrors = event.toolResults.some((tr) => tr.isError);
  let errorContext = "";
  if (hasErrors) {
    errorContext = event.toolResults
      .filter((tr) => tr.isError)
      .map((tr) => loadPrompt("builder_error", { error: JSON.stringify(tr) }))
      .join("\n");
  }

  const historyContext =
    sessionHistory.length > 1
      ? `\n\nSession history (${sessionHistory.length - 1} prior turn${sessionHistory.length > 2 ? "s" : ""}):\n${sessionHistory
          .slice(0, -1)
          .map((t, i) => `Turn ${i + 1}: ${JSON.stringify(t.message).slice(0, 150)}`)
          .join("\n")}`
      : "";

  const promptHistoryContext =
    recentUserPrompts.length > 0
      ? `\n\nRecent user prompts (${recentUserPrompts.length}):\n${recentUserPrompts.map((text, i) => `Prompt ${i + 1}: ${JSON.stringify(text).slice(0, 150)}`).join("\n")}`
      : "";

  const promptText = `${persona}\n\nAnalyze the following builder turn (turn ${turnIndex}${userPrompt ? ` — "${userPrompt.slice(0, 80)}"` : ""}):\n\nTurn content: ${JSON.stringify(event.message)}\nTool results: ${JSON.stringify(event.toolResults)}\n${errorContext}${historyContext}${promptHistoryContext}\n\nProvide concise feedback (1-3 sentences) or "LGTM".\n\n${stopTemplate}`;

  try {
    const feedback = await runVerificationPrompt(session, promptText);

    // Send feedback back to builder
    const response: IpcMessage = {
      timestamp: Date.now(),
      data: { type: "feedback", content: feedback },
    };
    client.write(toJsonl(response));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const response: IpcMessage = {
      timestamp: Date.now(),
      data: {
        type: "feedback",
        content: `⚠️ **Verifier error:** Analysis could not complete (${errorMessage}). Use /verify off then /verify on to restart.`,
      },
    };
    client.write(toJsonl(response));
  }
}

function runVerificationPrompt(agentSession: AgentSession, promptText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = agentSession.subscribe((evt) => {
      if (evt.type === "agent_end") {
        unsubscribe();
        const lastMsg = agentSession.messages.at(-1);
        const assistantText = extractAssistantText(lastMsg);
        resolve(assistantText || "No feedback generated");
      }
      if (evt.type === "auto_retry_end" && !evt.success) {
        unsubscribe();
        reject(new Error("Verification failed: " + evt.finalError));
      }
    });

    agentSession.prompt(promptText).catch(reject);
  });
}

function extractAssistantText(msg: unknown): string | undefined {
  if (!isAssistantMessage(msg)) return undefined;
  return msg.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

function handleMessage(data: IpcPayload): void {
  switch (data.type) {
    case "start": {
      if (isStartPayload(data)) {
        if (data.userPrompt) {
          recentUserPrompts.push(data.userPrompt);
          if (recentUserPrompts.length > MAX_PROMPTS) {
            recentUserPrompts.shift();
          }
        }
      }
      break;
    }
    case "stop": {
      if (isStopPayload(data)) {
        handleTurnEnd(data.event, data.turnIndex, data.userPrompt).catch((error) => {
          console.error("[verifier] Analysis error:", error);
        });
      }
      break;
    }
    case "session_start": {
      sessionHistory.length = 0;
      recentUserPrompts.length = 0;
      break;
    }
    case "error": {
      // eslint-disable-next-line no-console
      console.error("[verifier] Builder error:", data.detail);
      break;
    }
  }
}
