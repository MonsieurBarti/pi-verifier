import { spawn } from "node:child_process";
import { join } from "node:path";
import type { VerifierState } from "./types.js";

export interface VerifierSpawnDeps {
  state: VerifierState;
}

export function startVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  if (state.verifierProcess) return; // Already running

  const scriptPath = join(import.meta.dirname, "verifier.js");
  const proc = spawn(process.execPath, [scriptPath], {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  state.verifierProcess = proc;

  proc.stdout?.on("data", (data) => {
    console.log(`[verifier stdout] ${data.toString().trim()}`);
  });

  proc.stderr?.on("data", (data) => {
    console.error(`[verifier stderr] ${data.toString().trim()}`);
  });

  proc.on("exit", (code) => {
    console.log(`[pi-verifier] Verifier process exited with code ${code}`);
    state.verifierProcess = undefined;
    if (state.mode !== "off") {
      state.mode = "waiting";
    }
  });
}

export function stopVerifier(deps: VerifierSpawnDeps): void {
  const { state } = deps;
  if (!state.verifierProcess) return;

  state.verifierProcess.kill("SIGTERM");
  state.verifierProcess = undefined;
}
