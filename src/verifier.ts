// ---------------------------------------------------------------------------
// Verifier daemon — process entry point
//
// This module is spawned as a child process by verifier-spawn.ts. It runs
// independently with its own AgentSession and communicates with the builder
// over TCP loopback via JSON Lines.
// ---------------------------------------------------------------------------

import { createConnection } from "node:net";
import { createInterface } from "node:readline";
import { createAgentSession, type AgentSession } from "@earendil-works/pi-coding-agent";
import { loadPersona, loadPrompt } from "./prompt-loader.js";
import {
  isAssistantMessage,
  isIpcMessage,
  toJsonl,
  type IpcMessage,
  type IpcPayload,
  type TurnEndEvent,
} from "./types.js";

const PORT = Number(process.env.PI_VERIFIER_PORT) || 9876;
const HOST = "127.0.0.1";

const sessionHistory: TurnEndEvent[] = [];
const MAX_HISTORY = 10;

const recentInputs: string[] = [];
const MAX_INPUTS = 5;

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

async function handleTurnEnd(event: TurnEndEvent): Promise<void> {
  if (!session || isAnalyzing) return;

  isAnalyzing = true;
  try {
    await doHandleTurnEnd(event);
  } finally {
    isAnalyzing = false;
  }
}

async function doHandleTurnEnd(event: TurnEndEvent): Promise<void> {
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

  const inputContext =
    recentInputs.length > 0
      ? `\n\nRecent user inputs (${recentInputs.length}):\n${recentInputs.map((text, i) => `Input ${i + 1}: ${JSON.stringify(text).slice(0, 150)}`).join("\n")}`
      : "";

  const promptText = `${persona}\n\nAnalyze the following builder turn:\n\nTurn content: ${JSON.stringify(event.message)}\nTool results: ${JSON.stringify(event.toolResults)}\n${errorContext}${historyContext}${inputContext}\n\nProvide concise feedback (1-3 sentences) or "LGTM".\n\n${stopTemplate}`;

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
    case "turn_end": {
      handleTurnEnd(data.event).catch((error) => {
        console.error("[verifier] Analysis error:", error);
      });
      break;
    }
    case "session_start": {
      sessionHistory.length = 0;
      recentInputs.length = 0;
      break;
    }
    case "input": {
      const text = data.event.text?.trim();
      if (text) {
        recentInputs.push(text);
        if (recentInputs.length > MAX_INPUTS) {
          recentInputs.shift();
        }
      }
      break;
    }
  }
}
