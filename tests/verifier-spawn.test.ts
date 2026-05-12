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

vi.mock("node:fs/promises", () => ({
  access: vi.fn(() => Promise.resolve()),
  writeFile: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(() => Promise.resolve("")),
}));

vi.mock("node:os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
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
      verifierSessionId: "test-session",
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

    await startVerifier({ state });

    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining("Verifier launched in tmux session"),
      "info",
    );
  });

  it("warns when no session ID is set", async () => {
    const notifySpy = vi.fn();
    const state = makeMockState({
      verifierSessionId: undefined,
      lastContext: {
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

    await startVerifier({ state });

    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining("No session ID"), "warning");
  });

  it("kills verifier terminal on stop and clears session ID", async () => {
    const state = makeMockState({
      verifierSessionId: "test-session",
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

    expect(state.verifierSessionId).toBeUndefined();
  });

  it("notifies error when launch fails", async () => {
    const notifySpy = vi.fn();
    const state = makeMockState({
      mode: "active",
      verifierSessionId: "test-session",
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
    await startVerifier({ state });

    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to launch verifier"),
      "error",
    );
    expect(state.mode).toBe("waiting");
  });
});
