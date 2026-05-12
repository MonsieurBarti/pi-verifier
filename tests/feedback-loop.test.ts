import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";
import { createFeedbackLoop } from "../src/feedback-loop.js";
import { makeMockState, makeMockPi, makeMockEscalation } from "./mocks/fixtures.js";
import type { TurnEndEvent } from "../src/types.js";

describe("feedback-loop", () => {
  it("turnEndHandler skips when mode is off", () => {
    const state = makeMockState({ mode: "off" });
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler(fromAny<TurnEndEvent, unknown>({}));
    expect(state.pendingVerification).toBe(false);
  });

  it("turnEndHandler skips when pendingVerification is true", () => {
    const state = makeMockState({ mode: "active", pendingVerification: true });
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler(fromAny<TurnEndEvent, unknown>({}));
    expect(state.pendingVerification).toBe(true);
  });

  it("turnEndHandler skips turns caused by our own feedback injection", () => {
    const state = makeMockState({
      mode: "active",
      skipTurnEndCount: 2,
    });
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    // First turn_end: skipped, counter decremented to 1
    loop.turnEndHandler(fromAny<TurnEndEvent, unknown>({}));
    expect(state.pendingVerification).toBe(false);
    expect(state.skipTurnEndCount).toBe(1);

    // Second turn_end: skipped, counter decremented to 0
    loop.turnEndHandler(fromAny<TurnEndEvent, unknown>({}));
    expect(state.pendingVerification).toBe(false);
    expect(state.skipTurnEndCount).toBe(0);
  });

  it("turnEndHandler sets pendingVerification when conditions are met", () => {
    const state = makeMockState({
      mode: "active",
      pendingVerification: false,
      skipTurnEndCount: 0,
    });
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler(fromAny<TurnEndEvent, unknown>({}));
    expect(state.pendingVerification).toBe(true);
  });

  it("onFeedback injects message via sendUserMessage for non-empty non-LGTM content", () => {
    const state = makeMockState();
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "There is a bug here." });

    expect(state.pendingVerification).toBe(false);
    expect(state.skipTurnEndCount).toBe(1);
    expect(pi.sendUserMessage).toHaveBeenCalledTimes(1);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      "🔍 **Verifier feedback:**\nThere is a bug here.",
      { deliverAs: "followUp" },
    );
  });

  it("onFeedback ignores empty content", () => {
    const state = makeMockState();
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "" });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback ignores whitespace-only content", () => {
    const state = makeMockState();
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "   \n  " });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback ignores LGTM", () => {
    const state = makeMockState();
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback resets pendingVerification even for ignored content", () => {
    const state = makeMockState({ pendingVerification: true });
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });
    expect(state.pendingVerification).toBe(false);

    state.pendingVerification = true;
    loop.onFeedback({ type: "feedback", content: "" });
    expect(state.pendingVerification).toBe(false);
  });

  it("onFeedback increments skipTurnEndCount only for actionable content", () => {
    const state = makeMockState();
    const pi = makeMockPi();
    const escalation = makeMockEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });
    expect(state.skipTurnEndCount).toBe(0);

    loop.onFeedback({ type: "feedback", content: "Fix this." });
    expect(state.skipTurnEndCount).toBe(1);
  });
});
