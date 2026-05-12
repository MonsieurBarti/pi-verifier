import type { ExtensionAPI, VerifierState } from "./types.js";
import { createToggleCommand } from "./toggle-command.js";
import { startSocketServer, stopSocketServer } from "./socket-server.js";
import { createSessionCaptureHooks } from "./session-capture.js";

export type { ExtensionAPI, ExtensionContext } from "./types.js";

export default function verifierExtension(pi: ExtensionAPI): void {
  // eslint-disable-next-line no-console
  console.log("[pi-verifier] Extension loaded");

  const state: VerifierState = {
    mode: "off",
    port: 9876,
    server: undefined,
    clients: [],
    buffer: [],
    bufferTtlMs: 30000,
  };

  const onEnable = async (): Promise<void> => {
    await startSocketServer({ state });
  };

  const onDisable = (): void => {
    stopSocketServer({ state });
  };

  const toggleCmd = createToggleCommand({ state, pi, onEnable, onDisable });
  pi.registerCommand(toggleCmd.name, {
    description: toggleCmd.description,
    handler: toggleCmd.handler,
  });

  const hooks = createSessionCaptureHooks({ state });
  pi.on("session_start", hooks.sessionStartHandler);
  pi.on("turn_end", hooks.turnEndHandler);
  pi.on("input", hooks.inputHandler);

  // Status update interval
  let statusInterval: ReturnType<typeof setInterval> | undefined = undefined;
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setStatus("verifier", formatStatus(state));
    statusInterval = setInterval(() => {
      ctx.ui.setStatus("verifier", formatStatus(state));
    }, 1000);
  });

  pi.on("session_shutdown", () => {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = undefined;
    }
    if (state.mode !== "off") {
      onDisable();
      state.mode = "off";
    }
  });
}

function formatStatus(state: VerifierState): string | undefined {
  switch (state.mode) {
    case "off": {
      return undefined;
    }
    case "waiting": {
      return "🔍 Verifier: waiting";
    }
    case "active": {
      return "🔍 Verifier: active";
    }
    default: {
      return undefined;
    }
  }
}
