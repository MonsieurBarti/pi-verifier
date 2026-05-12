import type { EscalationController } from "./escalation.js";
import type { SessionReportTracker } from "./session-report.js";
import type { ExtensionAPI, TurnEndEvent, VerifierState } from "./types.js";

export interface FeedbackLoopDeps {
  state: VerifierState;
  pi: ExtensionAPI;
  escalation: EscalationController;
  reportTracker?: SessionReportTracker;
}

export interface FeedbackLoop {
  onFeedback: (payload: { type: "feedback"; content: string }) => void;
  turnEndHandler: (event: TurnEndEvent) => void;
}

export function createFeedbackLoop(deps: FeedbackLoopDeps): FeedbackLoop {
  const { state, pi, escalation, reportTracker } = deps;

  const onFeedback = (payload: { type: "feedback"; content: string }): void => {
    state.pendingVerification = false;

    const trimmed = payload.content.trim();
    if (trimmed === "" || trimmed === "LGTM") {
      reportTracker?.recordFeedback(payload.content);
      return;
    }

    const ctx = state.lastContext;
    if (ctx && escalation.checkEscalation(ctx)) return;

    state.lastFeedbackInjectedAt = Date.now();
    if (ctx) escalation.incrementAttempts(ctx);
    pi.sendUserMessage(`🔍 **Verifier feedback:**\n${payload.content}`, {
      deliverAs: "followUp",
    });
    reportTracker?.recordFeedback(payload.content);
  };

  const turnEndHandler = (_event: TurnEndEvent): void => {
    if (state.mode !== "active") return;
    reportTracker?.recordTurn();

    // Cooldown: skip turns that are follow-ups from our own injected feedback
    const now = Date.now();
    if (now - state.lastFeedbackInjectedAt < state.feedbackCooldownMs) {
      return;
    }

    // Only one verification at a time
    if (state.pendingVerification) {
      return;
    }

    state.pendingVerification = true;
  };

  return { onFeedback, turnEndHandler };
}
