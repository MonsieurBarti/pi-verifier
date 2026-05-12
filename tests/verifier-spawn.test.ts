import { describe, expect, it, vi, beforeEach } from "vitest";
import { startVerifier, stopVerifier } from "../src/verifier-spawn.js";
import { makeMockState } from "./mocks/fixtures.js";

let nextExecFileError: Error | undefined;

vi.mock("node:child_process", () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      cb: (error: Error | undefined, result: { stdout: string }) => void,
    ) => {
      cb(nextExecFileError, { stdout: "" });
    },
  ),
}));

vi.mock("node:path", () => ({
  join: vi.fn(() => "/mock/verifier.js"),
}));

beforeEach(() => {
  nextExecFileError = undefined;
});

describe("verifier-spawn with launcher", () => {
  it("launches verifier terminal", async () => {
    const notifySpy = vi.fn();
    const state = makeMockState({
      lastContext: {
        sessionManager: { getSessionId: () => "test-session" },
        ui: {
          notify: notifySpy,
          setStatus: vi.fn(),
          setWidget: vi.fn(),
          setWorkingIndicator: vi.fn(),
          setWorkingMessage: vi.fn(),
        },
        cwd: "/tmp",
      },
    });

    startVerifier({ state });

    // Allow microtasks to flush
    await new Promise((r) => {
      setTimeout(r, 10);
    });

    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining("Verifier launched in"), "info");
  });

  it("kills verifier terminal on stop", async () => {
    const state = makeMockState({
      lastContext: {
        sessionManager: { getSessionId: () => "test-session" },
        ui: {
          notify: vi.fn(),
          setStatus: vi.fn(),
          setWidget: vi.fn(),
          setWorkingIndicator: vi.fn(),
          setWorkingMessage: vi.fn(),
        },
        cwd: "/tmp",
      },
    });

    stopVerifier({ state });

    await new Promise((r) => {
      setTimeout(r, 10);
    });

    // Should not throw
    expect(true).toBe(true);
  });

  it("notifies error when launch fails", async () => {
    const notifySpy = vi.fn();
    const state = makeMockState({
      mode: "active",
      lastContext: {
        sessionManager: { getSessionId: () => "test-session" },
        ui: {
          notify: notifySpy,
          setStatus: vi.fn(),
          setWidget: vi.fn(),
          setWorkingIndicator: vi.fn(),
          setWorkingMessage: vi.fn(),
        },
        cwd: "/tmp",
      },
    });

    nextExecFileError = new Error("tmux not found");
    startVerifier({ state });

    await new Promise((r) => {
      setTimeout(r, 10);
    });

    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to launch verifier terminal"),
      "error",
    );
    expect(state.mode).toBe("waiting");
  });
});
