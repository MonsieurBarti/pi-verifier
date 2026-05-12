import { describe, expect, it, vi } from "vitest";
import { launchVerifierTerminal } from "../src/launcher.js";
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

  it("spawns new detached tmux session when not in tmux", async () => {
    const originalTmux = process.env.TMUX;
    delete process.env.TMUX;
    // ... setup mock for new-session, set-option, and openOsWindow ...
    const result = await launchVerifierTerminal({
      sessionId: "xyz",
      verifierScriptPath: "/dev/null",
      port: 9876,
    });
    expect(result.mode).toBe("new-window");
    process.env.TMUX = originalTmux;
  });
});
