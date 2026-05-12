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

    // Mark that the next turn_end should be skipped — it will be caused by
    // our own sendUserMessage injection. This prevents feedback loops.
    state.skipTurnEndCount++;
    if (ctx) escalation.incrementAttempts(ctx);
    pi.sendUserMessage(`🔍 **Verifier feedback:**\n${payload.content}`, {
      deliverAs: "followUp",
    });
    reportTracker?.recordFeedback(payload.content);
  };

  const turnEndHandler = (_event: TurnEndEvent): void => {
    if (state.mode !== "active") return;

    // Skip turn_ends that were caused by our own feedback injection.
    // This is the primary loop-breaker. The counter handles multiple
    // rapid feedback injections more reliably than a time-based cooldown.
    if (state.skipTurnEndCount > 0) {
      state.skipTurnEndCount--;
      return;
    }

    reportTracker?.recordTurn();

    // Only one verification at a time
    if (state.pendingVerification) {
      return;
    }

    state.pendingVerification = true;
  };

  return { onFeedback, turnEndHandler };
}
