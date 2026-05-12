import type { ExtensionAPI, ExtensionCommandContext, VerifierState } from "./types.js";
import { createToggleCommand } from "./toggle-command.js";
import { startSocketServerWithFallback, stopSocketServer } from "./socket-server.js";
import { createSessionCaptureHooks } from "./session-capture.js";
import { startVerifier, stopVerifier } from "./verifier-spawn.js";
import { getTmuxAttachCommand } from "./launcher.js";
import { createFeedbackLoop } from "./feedback-loop.js";
import { createEscalationController } from "./escalation.js";
import { createReadOnlyPolicy } from "./read-only-policy.js";
import { createVerifierPromptTool } from "./verifier-prompt-tool.js";
import { createStatusUI } from "./status-ui.js";
import { createSessionReportTracker, formatReport } from "./session-report.js";

export type { ExtensionAPI, ExtensionContext } from "./types.js";

export interface VerifierExtensionOptions {
  port?: number;
  portRetries?: number;
  maxRestarts?: number;
  restartDelayMs?: number;
  dangerousTools?: string[];
  allowedTools?: string[];
  toolPolicyMode?: "block" | "allow";
  feedbackCooldownMs?: number;
  maxVerificationAttempts?: number;
  bufferTtlMs?: number;
}

export default function verifierExtension(
  pi: ExtensionAPI,
  options?: VerifierExtensionOptions,
): void {
  // Extension loaded — state initialized below

  const state: VerifierState = {
    mode: "off",
    port: options?.port ?? 9876,
    portRetries: options?.portRetries ?? 5,
    maxRestarts: options?.maxRestarts ?? 3,
    restartDelayMs: options?.restartDelayMs ?? 1000,
    restartCount: 0,
    dangerousTools: new Set(options?.dangerousTools ?? ["write", "edit", "bash"]),
    allowedTools: new Set(options?.allowedTools ?? ["read", "grep", "find", "ls"]),
    toolPolicyMode: options?.toolPolicyMode ?? "block",
    sessionHistory: [],
    server: undefined,
    clients: [],
    buffer: [],
    bufferTtlMs: options?.bufferTtlMs ?? 30000,
    verifierProcess: undefined,
    verifierSessionId: undefined,
    pendingVerification: false,
    lastFeedbackInjectedAt: 0,
    feedbackCooldownMs: options?.feedbackCooldownMs ?? 5000,
    skipTurnEndCount: 0,
    verificationAttempts: 0,
    maxVerificationAttempts: options?.maxVerificationAttempts ?? 3,
    escalationPaused: false,
    lastContext: undefined,
  };

  const escalation = createEscalationController({ state, pi });
  const reportTracker = createSessionReportTracker(state);
  const feedbackLoop = createFeedbackLoop({ state, pi, escalation, reportTracker });
  const readOnlyPolicy = createReadOnlyPolicy({ state });
  const verifierPromptTool = createVerifierPromptTool({ state });
  const statusUI = createStatusUI();

  const onEnable = async (): Promise<void> => {
    await startSocketServerWithFallback({ state, onFeedback: feedbackLoop.onFeedback });
    await startVerifier({ state });
    pi.registerTool(verifierPromptTool);
  };

  const onDisable = (): void => {
    stopVerifier({ state });
    stopSocketServer({ state });
  };

  const onResume = (): void => {
    escalation.resume();
  };

  const onReport = (_cmdCtx: ExtensionCommandContext): void => {
    const report = reportTracker.generateReport();
    const formatted = formatReport(report);
    pi.sendUserMessage(formatted, { deliverAs: "followUp" });
  };

  const onLaunch = (cmdCtx: ExtensionCommandContext): void => {
    const sessionId = state.verifierSessionId;
    if (!sessionId) {
      cmdCtx.ui.notify(
        "[pi-verifier] Verifier is not running. Enable it first with /verify on",
        "warning",
      );
      return;
    }
    const attachCmd = getTmuxAttachCommand(sessionId);
    cmdCtx.ui.notify(`[pi-verifier] Run this in your terminal: ${attachCmd}`, "info");
  };

  const toggleCmd = createToggleCommand({
    state,
    pi,
    onEnable,
    onDisable,
    onResume,
    onReport,
    onLaunch,
  });
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
    if (statusInterval) {
      clearInterval(statusInterval);
    }
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
