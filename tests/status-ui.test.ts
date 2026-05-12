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

  it("returns widget content when active", () => {
    const widget = ui.formatWidget(makeMockState({ mode: "active", verificationAttempts: 2 }));
    expect(widget).toBeDefined();
    expect(widget!.join("\n")).toContain("Attempts:  2");
  });

  it("returns working indicator when analyzing", () => {
    const indicator = ui.formatWorkingIndicator(
      makeMockState({ mode: "active", pendingVerification: true }),
    );
    expect(indicator).toBeDefined();
    expect(indicator!.frames).toEqual(["◐", "◓", "◑", "◒"]);
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
