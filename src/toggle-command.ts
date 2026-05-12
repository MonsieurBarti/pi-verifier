import type { ExtensionAPI, ExtensionCommandContext, VerifierState } from "./types.js";

export interface ToggleCommandDeps {
  state: VerifierState;
  pi: ExtensionAPI;
  onEnable: () => void | Promise<void>;
  onDisable: () => void | Promise<void>;
}

export interface ToggleCommand {
  name: string;
  description: string;
  handler(args: string, ctx: ExtensionCommandContext): Promise<void>;
}

export function createToggleCommand(deps: ToggleCommandDeps): ToggleCommand {
  const { state, onEnable, onDisable } = deps;

  return {
    name: "verify",
    description: "Toggle verifier mode: /verify on | /verify off",
    async handler(args: string, ctx: ExtensionCommandContext): Promise<void> {
      const arg = args.trim().toLowerCase();

      if (arg === "on") {
        if (state.mode !== "off") {
          ctx.ui.notify("[pi-verifier] Already enabled.", "warning");
          return;
        }
        state.mode = "waiting";
        await onEnable();
        ctx.ui.notify(
          "[pi-verifier] Verifier mode enabled. Waiting for verifier connection...",
          "info",
        );
        return;
      }

      if (arg === "off") {
        if (state.mode === "off") {
          ctx.ui.notify("[pi-verifier] Already disabled.", "warning");
          return;
        }
        state.mode = "off";
        await onDisable();
        ctx.ui.notify("[pi-verifier] Verifier mode disabled.", "info");
        return;
      }

      ctx.ui.notify("[pi-verifier] Usage: /verify on | /verify off", "info");
    },
  };
}
