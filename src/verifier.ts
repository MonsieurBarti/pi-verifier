import { createConnection } from "node:net";
import { createInterface } from "node:readline";
import { createAgentSession, type AgentSession } from "@earendil-works/pi-coding-agent";
import { loadPersona, loadPrompt } from "./prompt-loader.js";
import type { IpcMessage, IpcPayload, TurnEndEvent } from "./types.js";

const PORT = 9876;
const HOST = "127.0.0.1";

const client = createConnection({ port: PORT, host: HOST });
const rl = createInterface({ input: client });

let session: AgentSession | undefined;

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line) as IpcMessage;
    handleMessage(msg.data);
  } catch {
    // ignore malformed lines
  }
});

client.on("connect", () => {
  console.log("[verifier] Connected to builder");
});

client.on("close", () => {
  console.log("[verifier] Disconnected, exiting");
  process.exit(0);
});

async function initSession(): Promise<void> {
  const { session: createdSession } = await createAgentSession({
    noTools: "all",
    tools: ["read", "grep", "find", "ls"],
  });
  session = createdSession;
  console.log("[verifier] AgentSession created with read-only tools");
  console.log("[verifier] Active tools:", session.getActiveToolNames().join(", "));
}

try {
  await initSession();
} catch (error) {
  console.error("[verifier] Failed to create session:", error);
  process.exit(1);
}

async function handleTurnEnd(event: TurnEndEvent): Promise<void> {
  if (!session) return;

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

  const promptText = `${persona}\n\nAnalyze the following builder turn:\n\nTurn content: ${JSON.stringify(event.message)}\nTool results: ${JSON.stringify(event.toolResults)}\n${errorContext}\n\nProvide concise feedback (1-3 sentences) or "LGTM".\n\n${stopTemplate}`;

  const feedback = await runVerificationPrompt(session, promptText);

  // Send feedback back to builder
  const response: IpcMessage = {
    timestamp: Date.now(),
    data: { type: "feedback", content: feedback },
  };
  client.write(JSON.stringify(response) + "\n");
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
  if (!msg || typeof msg !== "object") return undefined;
  const m = msg as { role?: string; content?: { type: string; text?: string }[] };
  if (m.role !== "assistant") return undefined;
  return m.content
    ?.filter((c) => c.type === "text")
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
      // Reset session context if needed
      break;
    }
    case "input": {
      // No-op for now
      break;
    }
  }
}
