import { describe, expect, it, vi, beforeEach } from "vitest";
import { startVerifier, stopVerifier } from "../src/verifier-spawn.js";
import type { VerifierState } from "../src/types.js";

const makeState = (): VerifierState => ({
  mode: "off",
  port: 9876,
  server: undefined,
  clients: [],
  buffer: [],
  bufferTtlMs: 30000,
  verifierProcess: undefined,
  pendingVerification: false,
  lastFeedbackInjectedAt: 0,
  feedbackCooldownMs: 5000,
  verificationAttempts: 0,
  maxVerificationAttempts: 3,
  escalationPaused: false,
  lastContext: undefined,
});

const mockProcs: {
  listeners: Record<string, ((...args: unknown[]) => void)[]>;
  kill: ReturnType<typeof vi.fn>;
}[] = [];

vi.mock("node:child_process", () => ({
  spawn: vi.fn((_command: string, _args: string[], _options: Record<string, unknown>) => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const on = (event: string, cb: (...args: unknown[]) => void): void => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    };
    const kill = vi.fn();
    const proc = {
      stdout: { on: (_event: string, _cb: (data: Buffer) => void): void => {} },
      stderr: { on: (_event: string, _cb: (data: Buffer) => void): void => {} },
      on,
      kill,
    };
    mockProcs.push({ listeners, kill });
    return proc;
  }),
}));

vi.mock("node:path", () => ({
  join: vi.fn(() => "/mock/verifier.js"),
}));

beforeEach(() => {
  mockProcs.length = 0;
});

describe("verifier-spawn", () => {
  it("should set verifierProcess on start", () => {
    const state = makeState();
    expect(state.verifierProcess).toBeUndefined();
    startVerifier({ state });
    expect(state.verifierProcess).toBeDefined();
    expect(mockProcs.length).toBe(1);
  });

  it("should be a no-op when already running", () => {
    const state = makeState();
    startVerifier({ state });
    const [firstProc] = mockProcs;
    startVerifier({ state });
    expect(mockProcs.length).toBe(1);
    expect(mockProcs[0]).toBe(firstProc);
  });

  it("should kill the process and clear state", () => {
    const state = makeState();
    state.mode = "active";
    startVerifier({ state });
    expect(state.verifierProcess).toBeDefined();
    stopVerifier({ state });
    expect(mockProcs[0]!.kill).toHaveBeenCalledWith("SIGTERM");
    expect(state.verifierProcess).toBeUndefined();
  });

  it("should update state to waiting on process exit", () => {
    const state = makeState();
    state.mode = "active";
    startVerifier({ state });
    const { listeners } = mockProcs[0]!;
    const exitListeners = listeners["exit"];
    expect(exitListeners).toBeDefined();
    expect(exitListeners!.length).toBeGreaterThan(0);
    exitListeners![0]!(0);
    expect(state.verifierProcess).toBeUndefined();
    expect(state.mode).toBe("waiting");
  });

  it("should keep mode as off when process exits while mode is off", () => {
    const state = makeState();
    state.mode = "off";
    startVerifier({ state });
    const { listeners } = mockProcs[0]!;
    const exitListeners = listeners["exit"];
    expect(exitListeners).toBeDefined();
    exitListeners![0]!(1);
    expect(state.verifierProcess).toBeUndefined();
    expect(state.mode).toBe("off");
  });
});
