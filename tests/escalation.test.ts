import { describe, it, expect } from "vitest";
import { createEscalationController } from "../src/escalation.js";
import { makeMockState, makeMockCtx, makeMockPi } from "./mocks/fixtures.js";

describe("escalation", () => {
  it("pauses after max attempts and notifies user", () => {
    const state = makeMockState({ mode: "active" });
    const ctx = makeMockCtx();
    const { incrementAttempts } = createEscalationController({ state, pi: makeMockPi() });
    incrementAttempts(ctx);
    incrementAttempts(ctx);
    incrementAttempts(ctx);
    expect(state.escalationPaused).toBe(true);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Escalating"), "warning");
  });

  it("blocks feedback injection when paused", () => {
    const state = makeMockState({ mode: "active", escalationPaused: true });
    const ctx = makeMockCtx();
    const { checkEscalation } = createEscalationController({ state, pi: makeMockPi() });
    expect(checkEscalation(ctx)).toBe(true);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("paused"), "warning");
  });

  it("resumes correctly", () => {
    const state = makeMockState({
      mode: "active",
      escalationPaused: true,
      verificationAttempts: 3,
    });
    const { resume } = createEscalationController({ state, pi: makeMockPi() });
    resume();
    expect(state.escalationPaused).toBe(false);
    expect(state.verificationAttempts).toBe(0);
  });

  it("checkEscalation returns false when not paused", () => {
    const state = makeMockState({ mode: "active", escalationPaused: false });
    const ctx = makeMockCtx();
    const { checkEscalation } = createEscalationController({ state, pi: makeMockPi() });
    expect(checkEscalation(ctx)).toBe(false);
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
