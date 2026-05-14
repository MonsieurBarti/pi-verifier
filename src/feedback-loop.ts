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

    // Mark the upcoming injected message so before_agent_start will skip it.
    // This is the primary loop-breaker: injected turns are excluded from the
    // verification cycle by the builder-side lifecycle gate.
    state.injectedNext = true;
    if (ctx) escalation.incrementAttempts(ctx);
    pi.sendUserMessage(`🔍 **Verifier feedback:**\n${payload.content}`, {
      deliverAs: "followUp",
    });
    reportTracker?.recordFeedback(payload.content);
  };

  const turnEndHandler = (_event: TurnEndEvent): void => {
    if (state.mode !== "active") return;
    reportTracker?.recordTurn();
    state.pendingVerification = true;
  };

  return { onFeedback, turnEndHandler };
}
