import type { PiCommandContext, PiExtensionApi, VerifierState } from "./types.js";

export interface ToggleCommandDeps {
  state: VerifierState;
  pi: PiExtensionApi;
  onEnable: () => void | Promise<void>;
  onDisable: () => void | Promise<void>;
}

export function createToggleCommand(deps: ToggleCommandDeps) {
  return {
    name: "verify",
    description: "Toggle verifier mode: /verify on | /verify off",
    async handler(args: string, ctx: PiCommandContext): Promise<void> {
      const arg = args.trim().toLowerCase();
      const { state, onEnable, onDisable } = deps;

      if (arg === "on") {
        if (state.mode !== "off") {
          const notify = ctx.ui && ctx.ui.notify;
          if (notify) notify("[pi-verifier] Already enabled.", "warning");
          return Promise.resolve();
        }
        state.mode = "waiting";
        await onEnable();
        const notify = ctx.ui && ctx.ui.notify;
        if (notify)
          notify("[pi-verifier] Verifier mode enabled. Waiting for verifier connection...", "info");
        return Promise.resolve();
      }

      if (arg === "off") {
        if (state.mode === "off") {
          const notify = ctx.ui && ctx.ui.notify;
          if (notify) notify("[pi-verifier] Already disabled.", "warning");
          return Promise.resolve();
        }
        state.mode = "off";
        await onDisable();
        const notify = ctx.ui && ctx.ui.notify;
        if (notify) notify("[pi-verifier] Verifier mode disabled.", "info");
        return Promise.resolve();
      }

      const notify = ctx.ui && ctx.ui.notify;
      if (notify) notify("[pi-verifier] Usage: /verify on | /verify off", "info");
      return Promise.resolve();
    },
  };
}
