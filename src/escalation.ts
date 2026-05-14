import type { ExtensionAPI, ExtensionContext, VerifierState } from "./types.js";

export interface EscalationDeps {
  state: VerifierState;
  pi: ExtensionAPI;
}

export interface EscalationController {
  checkEscalation: (ctx: ExtensionContext) => boolean;
  incrementAttempts: (ctx: ExtensionContext) => void;
  resume: () => void;
}

export function createEscalationController(deps: EscalationDeps): EscalationController {
  const { state } = deps;

  const checkEscalation = (ctx: ExtensionContext): boolean => {
    if (state.escalationPaused) {
      ctx.ui.notify(
        "[pi-verifier] Verification is paused. Use /verify resume to continue.",
        "warning",
      );
      return true;
    }
    return false;
  };

  const incrementAttempts = (ctx: ExtensionContext): void => {
    state.verificationAttempts += 1;
    if (state.verificationAttempts >= state.maxVerificationAttempts) {
      state.escalationPaused = true;
      ctx.ui.notify(
        `[pi-verifier] Verifier reached ${state.maxVerificationAttempts} consecutive feedback loops. Escalating to user. Use /verify resume to continue.`,
        "warning",
      );
    }
  };

  const resume = (): void => {
    state.escalationPaused = false;
    state.verificationAttempts = 0;
  };

  return { checkEscalation, incrementAttempts, resume };
}
