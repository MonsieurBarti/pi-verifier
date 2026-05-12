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
