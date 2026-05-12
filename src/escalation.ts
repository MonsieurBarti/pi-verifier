import type { ExtensionAPI, ExtensionContext, InputEvent, VerifierState } from "./types.js";

export interface EscalationDeps {
  state: VerifierState;
  pi: ExtensionAPI;
}

export interface EscalationController {
  inputHandler: (event: InputEvent, ctx: ExtensionContext) => void;
  checkEscalation: (ctx: ExtensionContext) => boolean;
  incrementAttempts: (ctx: ExtensionContext) => void;
  resume: () => void;
}

export function createEscalationController(deps: EscalationDeps): EscalationController {
  const { state } = deps;

  const inputHandler = (_event: InputEvent, _ctx: ExtensionContext): void => {
    // Reset counter on any real user input — this starts a fresh verification window
    state.verificationAttempts = 0;
  };

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

  return { inputHandler, checkEscalation, incrementAttempts, resume };
}
