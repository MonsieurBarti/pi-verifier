import type { Server, Socket } from "node:net";

export type {
  ExtensionAPI,
  ExtensionContext,
  ExtensionCommandContext,
  ExtensionHandler,
  RegisteredCommand,
  TurnEndEvent,
  SessionStartEvent,
  InputEvent,
} from "@mariozechner/pi-coding-agent";

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
}

export interface SessionEvent {
  type: "turn_end" | "session_start" | "input";
  timestamp: number;
  payload: unknown;
}
