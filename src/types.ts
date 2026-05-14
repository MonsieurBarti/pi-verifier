import type { Server, Socket } from "node:net";
import type { ChildProcess } from "node:child_process";
import type {
  ExtensionAPI,
  ExtensionContext,
  ExtensionCommandContext,
  ExtensionHandler,
  RegisteredCommand,
  TurnEndEvent,
  SessionStartEvent,
  InputEvent,
  BeforeAgentStartEvent,
  AgentEndEvent,
  InputSource,
} from "@earendil-works/pi-coding-agent";

export type {
  ExtensionAPI,
  ExtensionContext,
  ExtensionCommandContext,
  ExtensionHandler,
  RegisteredCommand,
  TurnEndEvent,
  SessionStartEvent,
  InputEvent,
  BeforeAgentStartEvent,
  AgentEndEvent,
  InputSource,
};

// ---------------------------------------------------------------------------
// Verifier extension-specific types
// ---------------------------------------------------------------------------

export const MODES = {
  OFF: "off",
  WAITING: "waiting",
  ACTIVE: "active",
} as const;

export type VerifierMode = (typeof MODES)[keyof typeof MODES];

export interface VerifierState {
  mode: VerifierMode;
  port: number;
  portRetries: number;
  maxRestarts: number;
  restartDelayMs: number;
  restartCount: number;
  dangerousTools: Set<string>;
  allowedTools: Set<string>;
  toolPolicyMode: "block" | "allow";
  server: Server | undefined;
  clients: Socket[];
  buffer: { timestamp: number; data: unknown }[];
  bufferTtlMs: number;
  verifierProcess: ChildProcess | undefined;
  verifierSessionId: string | undefined;
  pendingVerification: boolean;
  lastFeedbackInjectedAt: number;
  feedbackCooldownMs: number;
  verificationAttempts: number;
  maxVerificationAttempts: number;
  escalationPaused: boolean;
  lastContext: ExtensionContext | undefined;
  /** True when the next before_agent_start is from our own pi.sendUserMessage injection. */
  injectedNext: boolean;
  /** Monotonic turn counter incremented only for genuine user prompts. */
  turnIndex: number;
  /** The last non-extension user prompt text. */
  lastUserPrompt: string | undefined;
  /** Path to the builder's session JSONL file. */
  sessionFilePath: string | undefined;
  /** Whether the current turn is a genuine user turn (true) or injected feedback (false). */
  currentTurnGenuine: boolean;
}

export interface SessionEvent {
  type: "start" | "stop" | "session_start" | "error";
  timestamp: number;
  payload: unknown;
}

// ---------------------------------------------------------------------------
// IPC message types
// ---------------------------------------------------------------------------

export interface IpcMessage {
  timestamp: number;
  data: IpcPayload;
}

export type IpcPayload =
  | { type: "session_start" }
  | { type: "start"; turnIndex: number; userPrompt?: string }
  | { type: "stop"; turnIndex: number; event: TurnEndEvent; userPrompt?: string }
  | { type: "error"; detail: string }
  | { type: "feedback"; content: string }
  | { type: "analysis_error"; error: string };

export interface FeedbackPayload {
  type: "feedback";
  content: string;
}

// ---------------------------------------------------------------------------
// Serialization helper
// ---------------------------------------------------------------------------

export function toJsonl(obj: unknown): string {
  return JSON.stringify(obj) + "\n";
}

// ---------------------------------------------------------------------------
// Type guards — runtime validation for JSON-parsed IPC messages
// ---------------------------------------------------------------------------

export function isIpcMessage(value: unknown): value is IpcMessage {
  if (typeof value !== "object" || value === null) return false;
  const timestamp = Reflect.get(value, "timestamp");
  const data = Reflect.get(value, "data");
  return typeof timestamp === "number" && typeof data === "object" && data !== null;
}

export function isFeedbackPayload(value: unknown): value is FeedbackPayload {
  if (typeof value !== "object" || value === null) return false;
  const type = Reflect.get(value, "type");
  const content = Reflect.get(value, "content");
  return type === "feedback" && typeof content === "string";
}

export function isStartPayload(value: unknown): value is Extract<IpcPayload, { type: "start" }> {
  if (typeof value !== "object" || value === null) return false;
  const type = Reflect.get(value, "type");
  const turnIndex = Reflect.get(value, "turnIndex");
  return type === "start" && typeof turnIndex === "number";
}

export function isStopPayload(value: unknown): value is Extract<IpcPayload, { type: "stop" }> {
  if (typeof value !== "object" || value === null) return false;
  const type = Reflect.get(value, "type");
  const turnIndex = Reflect.get(value, "turnIndex");
  const event = Reflect.get(value, "event");
  return (
    type === "stop" && typeof turnIndex === "number" && typeof event === "object" && event !== null
  );
}

export function isAssistantMessage(
  value: unknown,
): value is { role: "assistant"; content: { type: "text"; text?: string }[] } {
  if (typeof value !== "object" || value === null) return false;
  const role = Reflect.get(value, "role");
  const content = Reflect.get(value, "content");
  if (role !== "assistant") return false;
  if (!Array.isArray(content)) return false;
  return content.every((c) => {
    if (typeof c !== "object" || c === null) return false;
    const type = Reflect.get(c, "type");
    const text = Reflect.get(c, "text");
    return type === "text" && (typeof text === "string" || text === undefined);
  });
}
