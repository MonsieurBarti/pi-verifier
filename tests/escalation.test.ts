import { describe, it, expect, vi } from "vitest";
import { createEscalationController } from "../src/escalation.js";
import type { VerifierState, ExtensionContext } from "../src/types.js";

function makeState(): VerifierState {
  return {
    mode: "active",
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
  } as unknown as VerifierState;
}

function makeCtx(): ExtensionContext {
  return { ui: { notify: vi.fn() } } as unknown as ExtensionContext;
}

describe("escalation", () => {
  it("resets attempts on input", () => {
    const state = makeState();
    state.verificationAttempts = 2;
    const { inputHandler } = createEscalationController({ state, pi: {} as any });
    inputHandler({ type: "input", text: "hello", source: "interactive" }, makeCtx());
    expect(state.verificationAttempts).toBe(0);
  });

  it("pauses after max attempts and notifies user", () => {
    const state = makeState();
    const ctx = makeCtx();
    const { incrementAttempts } = createEscalationController({ state, pi: {} as any });
    incrementAttempts(ctx);
    incrementAttempts(ctx);
    incrementAttempts(ctx);
    expect(state.escalationPaused).toBe(true);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Escalating"), "warning");
  });

  it("blocks feedback injection when paused", () => {
    const state = makeState();
    state.escalationPaused = true;
    const ctx = makeCtx();
    const { checkEscalation } = createEscalationController({ state, pi: {} as any });
    expect(checkEscalation(ctx)).toBe(true);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("paused"), "warning");
  });

  it("resumes correctly", () => {
    const state = makeState();
    state.escalationPaused = true;
    state.verificationAttempts = 3;
    const { resume } = createEscalationController({ state, pi: {} as any });
    resume();
    expect(state.escalationPaused).toBe(false);
    expect(state.verificationAttempts).toBe(0);
  });

  it("checkEscalation returns false when not paused", () => {
    const state = makeState();
    state.escalationPaused = false;
    const ctx = makeCtx();
    const { checkEscalation } = createEscalationController({ state, pi: {} as any });
    expect(checkEscalation(ctx)).toBe(false);
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
