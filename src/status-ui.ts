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
  if (state.escalationPaused) return "🔍 Verifier: paused (escalated)";
  if (state.pendingVerification) return "🔍 Verifier: analyzing…";
  if (state.mode === "waiting") return "🔍 Verifier: waiting";
  return "🔍 Verifier: active";
}

function formatWidget(state: VerifierState): string[] | undefined {
  if (state.mode === "off") return undefined;
  const lines = [
    `┌─ Verifier ───────────────────────┐`,
    `│ Mode:      ${state.mode.padEnd(20)} │`,
    `│ Attempts:  ${String(state.verificationAttempts).padEnd(20)} │`,
    `│ Max:       ${String(state.maxVerificationAttempts).padEnd(20)} │`,
    `│ Escalated: ${String(state.escalationPaused).padEnd(20)} │`,
    `└──────────────────────────────────┘`,
  ];
  return lines;
}

function formatWorkingIndicator(
  state: VerifierState,
): { frames: string[]; intervalMs: number } | undefined {
  if (state.mode !== "active" || !state.pendingVerification) return undefined;
  return {
    frames: ["◐", "◓", "◑", "◒"],
    intervalMs: 250,
  };
}

function formatWorkingMessage(state: VerifierState): string | undefined {
  if (state.mode !== "active" || !state.pendingVerification) return undefined;
  return "Verifier is analyzing the last turn…";
}

export function createStatusUI(): StatusUI {
  return { formatStatus, formatWidget, formatWorkingIndicator, formatWorkingMessage };
}
