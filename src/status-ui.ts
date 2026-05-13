import type { VerifierState } from "./types.js";

export interface StatusUI {
  formatStatus: (state: VerifierState) => string | undefined;
  formatWidget: (state: VerifierState) => string[] | undefined;
  formatWorkingIndicator: (
    state: VerifierState,
  ) => { frames: string[]; intervalMs: number } | undefined;
  formatWorkingMessage: (state: VerifierState) => string | undefined;
}

function formatStatus(state: VerifierState): string | undefined {
  if (state.mode === "off") return undefined;
  if (state.escalationPaused) return "🔍 Verifier: ⏸️ paused (escalated)";
  if (state.pendingVerification) return "🔍 Verifier: ⏳ analyzing…";
  if (state.mode === "waiting") return "🔍 Verifier: ⏳ waiting for connection";
  return "🔍 Verifier: ● active";
}

function formatWidget(state: VerifierState): string[] | undefined {
  if (state.mode === "off") return undefined;

  const statusEmoji = state.escalationPaused ? "⏸️" : state.pendingVerification ? "⏳" : "●";
  const statusText = state.escalationPaused
    ? "paused"
    : state.pendingVerification
      ? "analyzing"
      : state.mode;
  const attempts = `${state.verificationAttempts}/${state.maxVerificationAttempts}`;

  const lines = [`🔍 Verifier  ${statusEmoji} ${statusText}  |  Attempts: ${attempts}`];

  if (state.escalationPaused) {
    lines.push(`   ⏸️  Escalated — run /verify resume to continue`);
  } else if (state.pendingVerification) {
    lines.push(`   ⏳  Analyzing the last turn…`);
  }

  return lines;
}

function formatWorkingIndicator(
  state: VerifierState,
): { frames: string[]; intervalMs: number } | undefined {
  if (state.mode !== "active" || !state.pendingVerification) return undefined;
  return {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    intervalMs: 80,
  };
}

function formatWorkingMessage(state: VerifierState): string | undefined {
  if (state.mode !== "active" || !state.pendingVerification) return undefined;
  return "Verifier is analyzing the last turn…";
}

export function createStatusUI(): StatusUI {
  return { formatStatus, formatWidget, formatWorkingIndicator, formatWorkingMessage };
}
