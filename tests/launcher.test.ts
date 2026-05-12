import { describe, expect, it, vi } from "vitest";
import {
  launchVerifierTerminal,
  getTmuxAttachCommand,
  killVerifierTerminal,
} from "../src/launcher.js";
import { execFile } from "node:child_process";

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_cmd, _args, cb) => cb?.(undefined, { stdout: "" })),
}));

describe("launcher", () => {
  it("returns existing session if already running", async () => {
    vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
      if (args[0] === "has-session") {
        cb?.(undefined, { stdout: "" });
      }
      return undefined as unknown as ReturnType<typeof execFile>;
    });

    const result = await launchVerifierTerminal({
      sessionId: "abc",
      verifierScriptPath: "/dev/null",
      port: 9876,
    });
    expect(result.tmuxSession).toBe("pi-verifier-abc");
  });

  it("spawns new detached tmux session when not running", async () => {
    vi.mocked(execFile).mockImplementation((cmd, args, cb) => {
      // has-session fails (session doesn't exist)
      if (args[0] === "has-session") {
        cb?.(new Error("not found") as unknown as null, { stdout: "" });
      } else {
        cb?.(undefined, { stdout: "" });
      }
      return undefined as unknown as ReturnType<typeof execFile>;
    });

    const result = await launchVerifierTerminal({
      sessionId: "xyz",
      verifierScriptPath: "/dev/null",
      port: 9876,
    });
    expect(result.tmuxSession).toBe("pi-verifier-xyz");
  });

  it("getTmuxAttachCommand returns correct command", () => {
    expect(getTmuxAttachCommand("test-session")).toBe("tmux attach -t pi-verifier-test-session");
  });

  it("killVerifierTerminal calls tmux kill-session", async () => {
    const execMock = vi.mocked(execFile);
    execMock.mockImplementation((_cmd, _args, cb) => {
      cb?.(undefined, { stdout: "" });
      return undefined as unknown as ReturnType<typeof execFile>;
    });

    await killVerifierTerminal("abc");
    expect(execMock).toHaveBeenCalledWith(
      "tmux",
      ["kill-session", "-t", "pi-verifier-abc"],
      expect.any(Function),
    );
  });
});
