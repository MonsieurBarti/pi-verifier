import { describe, expect, it, vi } from "vitest";
import verifierExtension from "../src/index.js";
import { makeMockPi, makeMockCtx, makeMockCommandCtx } from "./mocks/fixtures.js";

vi.mock("../src/socket-server.js", () => ({
  startSocketServer: vi.fn(() => Promise.resolve()),
  stopSocketServer: vi.fn(),
  broadcast: vi.fn(),
}));

vi.mock("../src/verifier-spawn.js", () => ({
  startVerifier: vi.fn(),
  stopVerifier: vi.fn(),
}));

describe("verifierExtension entry point", () => {
  it("should register the /verify command", () => {
    const pi = makeMockPi();
    verifierExtension(pi);
    expect(pi.registerCommand).toHaveBeenCalledWith(
      "verify",
      expect.objectContaining({
        description: expect.stringContaining("verifier"),
      }),
    );
  });

  it("should register verifier_prompt tool when enabled", async () => {
    const pi = makeMockPi();
    verifierExtension(pi);

    const cmdCall = vi.mocked(pi.registerCommand).mock.calls.find((c) => c[0] === "verify");
    const cmdHandler = cmdCall![1].handler as (args: string, ctx: unknown) => Promise<void>;

    const ctx = makeMockCommandCtx();
    await cmdHandler("on", ctx);

    expect(pi.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "verifier_prompt" }),
    );

    // Clean up
    const sessionShutdownHandler = vi.mocked(pi.on).mock.calls
      .find((call) => call[0] === "session_shutdown")?.[1] as () => void;
    sessionShutdownHandler?.();
  });

  it("should register session hooks", () => {
    const pi = makeMockPi();
    verifierExtension(pi);
    expect(pi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
    expect(pi.on).toHaveBeenCalledWith("turn_end", expect.any(Function));
    expect(pi.on).toHaveBeenCalledWith("input", expect.any(Function));
    expect(pi.on).toHaveBeenCalledWith("tool_call", expect.any(Function));
  });

  it("should set initial status on session_start", () => {
    const pi = makeMockPi();
    verifierExtension(pi);

    const sessionStartHandlers = vi.mocked(pi.on).mock.calls
      .filter((call) => call[0] === "session_start")
      .map((call) => call[1] as (event: unknown, ctx: unknown) => void);

    const ctx = makeMockCtx();
    for (const handler of sessionStartHandlers) {
      handler?.({}, ctx);
    }

    expect(ctx.ui.setStatus).toHaveBeenCalledWith("verifier", undefined);

    // Clean up interval by calling session_shutdown
    const sessionShutdownHandler = vi.mocked(pi.on).mock.calls
      .find((call) => call[0] === "session_shutdown")?.[1] as () => void;
    sessionShutdownHandler?.();
  });
});
