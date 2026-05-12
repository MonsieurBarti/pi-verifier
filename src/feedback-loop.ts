import type { ExtensionAPI, TurnEndEvent, VerifierState } from "./types.js";

export interface FeedbackLoopDeps {
  state: VerifierState;
  pi: ExtensionAPI;
}

export interface FeedbackLoop {
  onFeedback: (payload: { type: "feedback"; content: string }) => void;
  turnEndHandler: (event: TurnEndEvent) => void;
}

export function createFeedbackLoop(deps: FeedbackLoopDeps): FeedbackLoop {
  const { state, pi } = deps;

  const onFeedback = (payload: { type: "feedback"; content: string }): void => {
    state.pendingVerification = false;

    if (!payload.content || payload.content.trim() === "") return;
    if (payload.content.trim() === "LGTM") return;

    state.lastFeedbackInjectedAt = Date.now();
    pi.sendUserMessage(`🔍 **Verifier feedback:**\n${payload.content}`, {
      deliverAs: "followUp",
    });
  };

  const turnEndHandler = (event: TurnEndEvent): void => {
    if (state.mode !== "active") return;

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

    // Forward turn_end to verifier via TCP (broadcast handled by session-capture)
    // This handler is called in addition to session-capture's broadcast
    void event; // silence unused warning — the event is forwarded by broadcast
  };

  return { onFeedback, turnEndHandler };
}
