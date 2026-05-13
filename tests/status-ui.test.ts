import { describe, it, expect } from "vitest";
import { createStatusUI } from "../src/status-ui.js";
import { makeMockState } from "./mocks/fixtures.js";

const ui = createStatusUI();

describe("status-ui", () => {
  it("returns undefined status when off", () => {
    expect(ui.formatStatus(makeMockState())).toBeUndefined();
  });

  it("shows paused status when escalated", () => {
    expect(ui.formatStatus(makeMockState({ mode: "active", escalationPaused: true }))).toContain(
      "paused",
    );
  });

  it("shows analyzing status when pending", () => {
    expect(ui.formatStatus(makeMockState({ mode: "active", pendingVerification: true }))).toContain(
      "analyzing",
    );
  });

  it("returns compact widget when active", () => {
    const widget = ui.formatWidget(makeMockState({ mode: "active", verificationAttempts: 2 }));
    expect(widget).toBeDefined();
    expect(widget![0]).toContain("● active");
    expect(widget![0]).toContain("Attempts: 2/3");
  });

  it("returns compact widget when escalated", () => {
    const widget = ui.formatWidget(
      makeMockState({ mode: "active", escalationPaused: true, verificationAttempts: 3 }),
    );
    expect(widget).toBeDefined();
    expect(widget![0]).toContain("⏸️ paused");
    expect(widget![0]).toContain("Attempts: 3/3");
    expect(widget![1]).toContain("Escalated");
  });

  it("returns compact widget when analyzing", () => {
    const widget = ui.formatWidget(
      makeMockState({ mode: "active", pendingVerification: true, verificationAttempts: 1 }),
    );
    expect(widget).toBeDefined();
    expect(widget![0]).toContain("⏳ analyzing");
    expect(widget![1]).toContain("Analyzing");
  });

  it("returns Braille working indicator when analyzing", () => {
    const indicator = ui.formatWorkingIndicator(
      makeMockState({ mode: "active", pendingVerification: true }),
    );
    expect(indicator).toBeDefined();
    expect(indicator!.frames).toEqual(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]);
    expect(indicator!.intervalMs).toBe(80);
  });

  it("returns working message when analyzing", () => {
    expect(
      ui.formatWorkingMessage(makeMockState({ mode: "active", pendingVerification: true })),
    ).toContain("analyzing");
  });

  it("shows waiting status when waiting", () => {
    expect(ui.formatStatus(makeMockState({ mode: "waiting" }))).toContain("waiting");
  });

  it("shows active status when active and no flags", () => {
    expect(ui.formatStatus(makeMockState({ mode: "active" }))).toContain("active");
  });
});
