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
};

// ---------------------------------------------------------------------------
// Verifier extension-specific types
// ---------------------------------------------------------------------------

export type VerifierMode = "off" | "waiting" | "active";

export interface VerifierState {
  mode: VerifierMode;
  port: number;
  server: Server | undefined;
  clients: Socket[];
  buffer: unknown[];
  bufferTtlMs: number;
  // NEW fields for M4
  verifierProcess: ChildProcess | undefined;
  pendingVerification: boolean;
  lastFeedbackInjectedAt: number;
  feedbackCooldownMs: number;
  // NEW fields for M5
  verificationAttempts: number;
  maxVerificationAttempts: number;
  escalationPaused: boolean;
  lastContext: ExtensionContext | undefined;
}

export interface SessionEvent {
  type: "turn_end" | "session_start" | "input";
  timestamp: number;
  payload: unknown;
}

// ---------------------------------------------------------------------------
// IPC message types for M4 (Task 1 + Task 2)
// ---------------------------------------------------------------------------

export interface IpcMessage {
  timestamp: number;
  data: IpcPayload;
}

export type IpcPayload =
  | { type: "session_start" }
  | { type: "turn_end"; event: TurnEndEvent }
  | { type: "input"; event: InputEvent }
  | { type: "feedback"; content: string };

export interface FeedbackPayload {
  type: "feedback";
  content: string;
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
