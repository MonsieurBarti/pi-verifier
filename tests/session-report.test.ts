import { describe, expect, it } from "vitest";
import { createSessionReportTracker, formatReport } from "../src/session-report.js";
import { makeMockState } from "./mocks/fixtures.js";

describe("session report", () => {
  it("tracks turns and feedback", () => {
    const state = makeMockState();
    const tracker = createSessionReportTracker(state);
    tracker.recordTurn();
    tracker.recordTurn();
    tracker.recordFeedback("LGTM");
    tracker.recordFeedback("Fix the loop");
    const report = tracker.generateReport();
    expect(report.totalTurns).toBe(2);
    expect(report.feedbackCount).toBe(2);
    expect(report.lgtmCount).toBe(1);
    expect(report.issues).toEqual(["Fix the loop"]);
  });

  it("formats report as markdown", () => {
    const state = makeMockState();
    const tracker = createSessionReportTracker(state);
    tracker.recordTurn();
    tracker.recordFeedback("LGTM");
    const report = tracker.generateReport();
    const formatted = formatReport(report);
    expect(formatted).toContain("Session Report");
    expect(formatted).toContain("Turns analyzed: 1");
    expect(formatted).toContain("LGTM (clean): 1");
  });
});
