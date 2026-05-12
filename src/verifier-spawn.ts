import { spawn } from "node:child_process";
import { join } from "node:path";
import type { VerifierState } from "./types.js";

export interface VerifierSpawnDeps {
  state: VerifierState;
}

export function startVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  if (state.verifierProcess) return;
  doStartVerifier(deps);
}

function doStartVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;

  const scriptPath = join(import.meta.dirname, "verifier.js");
  const proc = spawn(process.execPath, [scriptPath], {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PI_VERIFIER_PORT: String(state.port) },
  });

  state.verifierProcess = proc;

  proc.stdout?.on("data", (data) => {
    // eslint-disable-next-line no-console
    console.log(`[verifier stdout] ${data.toString().trim()}`);
  });

  proc.stderr?.on("data", (data) => {
    // eslint-disable-next-line no-console
    console.error(`[verifier stderr] ${data.toString().trim()}`);
  });

  proc.on("exit", (code) => {
    // eslint-disable-next-line no-console
    console.log(`[pi-verifier] Verifier process exited with code ${code}`);
    state.verifierProcess = undefined;

    if (state.mode === "off") return;

    if (state.restartCount >= state.maxRestarts) {
      state.mode = "waiting";
      state.lastContext?.ui.notify(
        `[pi-verifier] Verifier crashed ${state.maxRestarts} times. Giving up. Use /verify off then /verify on to retry.`,
        "error",
      );
      return;
    }

    state.restartCount++;
    state.mode = "waiting";
    const delay = state.restartDelayMs * Math.pow(2, state.restartCount - 1);
    state.lastContext?.ui.notify(
      `[pi-verifier] Verifier crashed (code ${code}). Restarting in ${delay}ms (attempt ${state.restartCount}/${state.maxRestarts})…`,
      "warning",
    );

    setTimeout(() => {
      if (state.mode !== "off") {
        doStartVerifier(deps);
      }
    }, delay);
  });
}

export function stopVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  if (!state.verifierProcess) return;
  state.verifierProcess.kill("SIGTERM");
  state.verifierProcess = undefined;
}
