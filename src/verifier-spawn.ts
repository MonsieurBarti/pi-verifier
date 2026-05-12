import { join } from "node:path";
import { launchVerifierTerminal, killVerifierTerminal } from "./launcher.js";
import type { VerifierState } from "./types.js";

export interface VerifierSpawnDeps {
  state: VerifierState;
}

export function startVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  if (state.verifierProcess) return;

  const scriptPath = join(import.meta.dirname, "verifier.js");

  void launchVerifierTerminal({
    sessionId: state.lastContext?.sessionManager.getSessionId() ?? "unknown",
    verifierScriptPath: scriptPath,
    port: state.port,
  })
    .then((result) => {
      state.lastContext?.ui.notify(
        `[pi-verifier] Verifier launched in ${result.mode} mode (tmux: ${result.tmuxSession}).`,
        "info",
      );
    })
    .catch((error) => {
      state.lastContext?.ui.notify(
        `[pi-verifier] Failed to launch verifier terminal: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      state.mode = "waiting";
    });
}

export function stopVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  const sessionId = state.lastContext?.sessionManager?.getSessionId();
  if (sessionId) {
    void killVerifierTerminal(sessionId);
  }
}
