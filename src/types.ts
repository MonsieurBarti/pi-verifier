import type { Server, Socket } from "node:net";

// ---------------------------------------------------------------------------
// Shared types for the pi-verifier extension.
// All structural PI API types live here so other modules can import them.
// ---------------------------------------------------------------------------

export type PiEventHandler = (event: unknown, ctx: unknown) => unknown | Promise<unknown>;

export interface PiRegisteredTool {
  name: string;
  label: string;
  description: string;
  promptSnippet: string;
  promptGuidelines: string[];
  parameters: unknown;
  execute(
    toolCallId: string,
    input: unknown,
  ): Promise<{
    content: { type: "text"; text: string }[];
    details: unknown;
  }>;
}

export interface PiRegisteredCommand {
  description?: string;
  handler(args: string, ctx: PiCommandContext): Promise<void>;
}

export interface PiCommandContext {
  ui?: {
    notify?: (message: string, level?: string) => void;
    setStatus?: (status: string) => void;
  };
  cwd?: string;
}

export interface PiExtensionApi {
  on(event: string, handler: PiEventHandler): void;
  registerTool(tool: PiRegisteredTool): void;
  registerCommand(name: string, config: PiRegisteredCommand): void;
  exec: (
    cmd: string,
    args: string[],
    opts?: { timeout?: number },
  ) => Promise<{ stdout: string; code: number }>;
  cwd?: string;
}

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
