import type { ExtensionAPI, VerifierState } from "./types.js";
import { createToggleCommand } from "./toggle-command.js";
import { startSocketServer, stopSocketServer } from "./socket-server.js";
import { createSessionCaptureHooks } from "./session-capture.js";
import { startVerifier, stopVerifier } from "./verifier-spawn.js";
import { createFeedbackLoop } from "./feedback-loop.js";
import { createEscalationController } from "./escalation.js";
import { createReadOnlyPolicy } from "./read-only-policy.js";
import { createVerifierPromptTool } from "./verifier-prompt-tool.js";
import { createStatusUI } from "./status-ui.js";

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
    verifierProcess: undefined,
    pendingVerification: false,
    lastFeedbackInjectedAt: 0,
    feedbackCooldownMs: 5000,
    verificationAttempts: 0,
    maxVerificationAttempts: 3,
    escalationPaused: false,
    lastContext: undefined,
  };

  const escalation = createEscalationController({ state, pi });
  const feedbackLoop = createFeedbackLoop({ state, pi, escalation });
  const readOnlyPolicy = createReadOnlyPolicy({ state });
  const verifierPromptTool = createVerifierPromptTool({ state });
  const statusUI = createStatusUI();

  const onEnable = async (): Promise<void> => {
    await startSocketServer({ state, onFeedback: feedbackLoop.onFeedback });
    startVerifier({ state });
    pi.registerTool(verifierPromptTool);
  };

  const onDisable = (): void => {
    stopVerifier({ state });
    stopSocketServer({ state });
  };

  const onResume = (): void => {
    escalation.resume();
  };

  const toggleCmd = createToggleCommand({ state, pi, onEnable, onDisable, onResume });
  pi.registerCommand(toggleCmd.name, {
    description: toggleCmd.description,
    handler: toggleCmd.handler,
  });

  const hooks = createSessionCaptureHooks({ state, onTurnEnd: feedbackLoop.turnEndHandler });
  pi.on("session_start", hooks.sessionStartHandler);
  pi.on("turn_end", hooks.turnEndHandler);
  pi.on("input", hooks.inputHandler);
  pi.on("input", escalation.inputHandler);
  pi.on("tool_call", readOnlyPolicy.toolCallHandler);

  // Enhanced status updates
  let statusInterval: ReturnType<typeof setInterval> | undefined = undefined;
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setStatus("verifier", statusUI.formatStatus(state));
    statusInterval = setInterval(() => {
      const ctxCurrent = state.lastContext;
      if (!ctxCurrent) return;
      ctxCurrent.ui.setStatus("verifier", statusUI.formatStatus(state));
      const widget = statusUI.formatWidget(state);
      if (widget) {
        ctxCurrent.ui.setWidget("verifier", widget, { placement: "belowEditor" });
      }
      const indicator = statusUI.formatWorkingIndicator(state);
      if (indicator) {
        ctxCurrent.ui.setWorkingIndicator(indicator);
      }
      const message = statusUI.formatWorkingMessage(state);
      if (message) {
        ctxCurrent.ui.setWorkingMessage(message);
      }
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
