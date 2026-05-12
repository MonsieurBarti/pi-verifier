import { describe, expect, it, vi } from "vitest";
import { createFeedbackLoop } from "../src/feedback-loop.js";
import type { ExtensionAPI, TurnEndEvent, VerifierState } from "../src/types.js";

const makeState = (overrides?: Partial<VerifierState>): VerifierState => ({
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
  ...overrides,
});

const makePi = (): ExtensionAPI =>
  ({
    sendUserMessage: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
  }) as unknown as ExtensionAPI;

const makeEscalation = () => ({
  inputHandler: vi.fn(),
  checkEscalation: vi.fn(() => false),
  incrementAttempts: vi.fn(),
  resume: vi.fn(),
});

describe("feedback-loop", () => {
  it("turnEndHandler skips when mode is off", () => {
    const state = makeState({ mode: "off" });
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler({} as unknown as TurnEndEvent);
    expect(state.pendingVerification).toBe(false);
  });

  it("turnEndHandler skips when pendingVerification is true", () => {
    const state = makeState({ mode: "active", pendingVerification: true });
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler({} as unknown as TurnEndEvent);
    expect(state.pendingVerification).toBe(true);
  });

  it("turnEndHandler skips during cooldown period", () => {
    const now = Date.now();
    const state = makeState({
      mode: "active",
      lastFeedbackInjectedAt: now,
      feedbackCooldownMs: 10000,
    });
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler({} as unknown as TurnEndEvent);
    expect(state.pendingVerification).toBe(false);
  });

  it("turnEndHandler sets pendingVerification when conditions are met", () => {
    const state = makeState({
      mode: "active",
      pendingVerification: false,
      lastFeedbackInjectedAt: 0,
      feedbackCooldownMs: 5000,
    });
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.turnEndHandler({} as unknown as TurnEndEvent);
    expect(state.pendingVerification).toBe(true);
  });

  it("onFeedback injects message via sendUserMessage for non-empty non-LGTM content", () => {
    const state = makeState();
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "There is a bug here." });

    expect(state.pendingVerification).toBe(false);
    expect(state.lastFeedbackInjectedAt).toBeGreaterThan(0);
    expect(pi.sendUserMessage).toHaveBeenCalledTimes(1);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      "🔍 **Verifier feedback:**\nThere is a bug here.",
      { deliverAs: "followUp" },
    );
  });

  it("onFeedback ignores empty content", () => {
    const state = makeState();
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "" });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback ignores whitespace-only content", () => {
    const state = makeState();
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "   \n  " });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback ignores LGTM", () => {
    const state = makeState();
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });

    expect(state.pendingVerification).toBe(false);
    expect(pi.sendUserMessage).not.toHaveBeenCalled();
  });

  it("onFeedback resets pendingVerification even for ignored content", () => {
    const state = makeState({ pendingVerification: true });
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });
    expect(state.pendingVerification).toBe(false);

    state.pendingVerification = true;
    loop.onFeedback({ type: "feedback", content: "" });
    expect(state.pendingVerification).toBe(false);
  });

  it("onFeedback sets lastFeedbackInjectedAt only for actionable content", () => {
    const state = makeState();
    const pi = makePi();
    const escalation = makeEscalation();
    const loop = createFeedbackLoop({ state, pi, escalation });

    loop.onFeedback({ type: "feedback", content: "LGTM" });
    expect(state.lastFeedbackInjectedAt).toBe(0);

    loop.onFeedback({ type: "feedback", content: "Fix this." });
    expect(state.lastFeedbackInjectedAt).toBeGreaterThan(0);
  });
});
