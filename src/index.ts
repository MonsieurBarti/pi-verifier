// ---------------------------------------------------------------------------
// Structural PI API — minimal subset of what @mariozechner/pi-coding-agent
// exposes at runtime. We avoid importing the real type so this package can
// be imported and unit-tested without the peer dep installed.
// ---------------------------------------------------------------------------

type PiEventHandler = (event: unknown, ctx: unknown) => unknown | Promise<unknown>;

interface PiRegisteredTool {
  name: string;
  label: string;
  description: string;
  promptSnippet: string;
  promptGuidelines: string[];
  parameters: unknown;
  execute(toolCallId: string, input: unknown): Promise<{
    content: Array<{ type: "text"; text: string }>;
    details: unknown;
  }>;
}

interface PiRegisteredCommand {
  description?: string;
  handler(args: string, ctx: PiCommandContext): Promise<void>;
}

interface PiCommandContext {
  ui?: {
    notify?: (message: string, level?: string) => void;
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
// Default export — called by PI with its ExtensionAPI instance at startup.
// This stub version logs load and does nothing else, ensuring no-op safety
// when the extension is inactive.
// ---------------------------------------------------------------------------

export default function verifierExtension(pi: PiExtensionApi): void {
  // eslint-disable-next-line no-console
  console.log("[pi-verifier] Extension loaded (no-op stub)");

  // Register a no-op /verify command for future milestone wiring
  pi.registerCommand("verify", {
    description: "Toggle verifier mode (stub — no-op)",
    async handler(_args, ctx) {
      ctx.ui?.notify?.("[pi-verifier] Verifier is not yet implemented.", "info");
    },
  });
}
