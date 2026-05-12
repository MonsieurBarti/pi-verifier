import type { VerifierState } from "./types.js";

export function formatStatus(state: VerifierState): string {
  switch (state.mode) {
    case "off": {
      return "🔍 Verifier: off";
    }
    case "waiting": {
      return "🔍 Verifier: waiting";
    }
    case "active": {
      return "🔍 Verifier: active";
    }
    default: {
      return "🔍 Verifier: unknown";
    }
  }
}

export function updateStatus(state: VerifierState, setStatus: (status: string) => void): void {
  setStatus(formatStatus(state));
}
