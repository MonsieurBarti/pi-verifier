// ---------------------------------------------------------------------------
// Structural PI API — Minimal subset of what @mariozechner/pi-coding-agent
// Exposes at runtime. We avoid importing the real type so this package can
// Be imported and unit-tested without the peer dep installed.
// ---------------------------------------------------------------------------

type PiEventHandler = (event: unknown, ctx: unknown) => unknown | Promise<unknown>;

interface PiRegisteredTool {
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
// Default export — Called by PI with its ExtensionAPI instance at startup.
// This stub version logs load and does nothing else, ensuring no-op safety
// When the extension is inactive.
// ---------------------------------------------------------------------------

export default function verifierExtension(pi: PiExtensionApi): void {
  // eslint-disable-next-line no-console
  console.log("[pi-verifier] Extension loaded (no-op stub)");

  // Register a no-op /verify command for future milestone wiring
  pi.registerCommand("verify", {
    description: "Toggle verifier mode (stub — no-op)",
    handler(_args, ctx) {
      const notify = ctx.ui && ctx.ui.notify;
      if (notify) {
        notify("[pi-verifier] Verifier is not yet implemented.", "info");
      }
      return Promise.resolve();
    },
  });
}
