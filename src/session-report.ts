import type { VerifierState } from "./types.js";

export interface SessionReport {
  startTime: number;
  endTime?: number;
  totalTurns: number;
  feedbackCount: number;
  lgtmCount: number;
  errorCount: number;
  issues: string[];
  wasEscalated: boolean;
}

export interface SessionReportTracker {
  recordTurn: () => void;
  recordFeedback: (content: string) => void;
  generateReport: () => SessionReport;
}

export function createSessionReportTracker(state: VerifierState): SessionReportTracker {
  const startTime = Date.now();
  let totalTurns = 0;
  let feedbackCount = 0;
  let lgtmCount = 0;
  const issues: string[] = [];

  return {
    recordTurn: () => {
      totalTurns++;
    },
    recordFeedback: (content: string) => {
      feedbackCount++;
      const trimmed = content.trim();
      if (trimmed === "LGTM") {
        lgtmCount++;
      } else {
        issues.push(trimmed.slice(0, 200));
      }
    },
    generateReport: (): SessionReport => ({
      startTime,
      endTime: Date.now(),
      totalTurns,
      feedbackCount,
      lgtmCount,
      errorCount: state.restartCount,
      issues,
      wasEscalated: state.escalationPaused,
    }),
  };
}

export function formatReport(report: SessionReport): string {
  const duration = report.endTime
    ? `${Math.round((report.endTime - report.startTime) / 1000)}s`
    : "ongoing";

  const lines = [
    `📊 **Session Report** (${duration})`,
    ``,
    `- Turns analyzed: ${report.totalTurns}`,
    `- Feedback given: ${report.feedbackCount}`,
    `- LGTM (clean): ${report.lgtmCount}`,
    `- Issues flagged: ${report.issues.length}`,
    `- Verifier restarts: ${report.errorCount}`,
    `- Escalated: ${report.wasEscalated ? "Yes ⚠️" : "No ✅"}`,
  ];

  if (report.issues.length > 0) {
    lines.push(``, `**Flagged issues:**`, ...report.issues.map((issue, i) => `${i + 1}. ${issue}`));
  }

  return lines.join("\n");
}
