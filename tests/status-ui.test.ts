import { describe, it, expect } from "vitest";
import { createStatusUI } from "../src/status-ui.js";
import type { VerifierState } from "../src/types.js";

function makeState(overrides: Partial<VerifierState> = {}): VerifierState {
  const base: VerifierState = {
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
  return Object.assign(base, overrides);
}

const ui = createStatusUI();

describe("status-ui", () => {
  it("returns undefined status when off", () => {
    expect(ui.formatStatus(makeState())).toBeUndefined();
  });

  it("shows paused status when escalated", () => {
    expect(ui.formatStatus(makeState({ mode: "active", escalationPaused: true }))).toContain(
      "paused",
    );
  });

  it("shows analyzing status when pending", () => {
    expect(ui.formatStatus(makeState({ mode: "active", pendingVerification: true }))).toContain(
      "analyzing",
    );
  });

  it("returns widget content when active", () => {
    const widget = ui.formatWidget(makeState({ mode: "active", verificationAttempts: 2 }));
    expect(widget).toBeDefined();
    expect(widget!.join("\n")).toContain("Attempts:  2");
  });

  it("returns working indicator when analyzing", () => {
    const indicator = ui.formatWorkingIndicator(
      makeState({ mode: "active", pendingVerification: true }),
    );
    expect(indicator).toBeDefined();
    expect(indicator!.frames).toEqual(["◐", "◓", "◑", "◒"]);
  });

  it("returns working message when analyzing", () => {
    expect(
      ui.formatWorkingMessage(makeState({ mode: "active", pendingVerification: true })),
    ).toContain("analyzing");
  });

  it("shows waiting status when waiting", () => {
    expect(ui.formatStatus(makeState({ mode: "waiting" }))).toContain("waiting");
  });

  it("shows active status when active and no flags", () => {
    expect(ui.formatStatus(makeState({ mode: "active" }))).toContain("active");
  });
});
