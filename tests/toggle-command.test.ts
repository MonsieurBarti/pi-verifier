import { describe, expect, it, vi } from "vitest";
import { createToggleCommand } from "../src/toggle-command.js";
import type { PiExtensionApi, VerifierState } from "../src/types.js";

function makeMockState(): VerifierState {
  return {
    mode: "off",
    port: 9876,
    server: undefined,
    clients: [],
    buffer: [],
    bufferTtlMs: 30000,
  };
}

function makeMockPi(): PiExtensionApi {
  return {
    cwd: "/tmp",
    exec: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
  };
}

describe("toggle-command", () => {
  it("should enable verifier mode on 'on'", async () => {
    const state = makeMockState();
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    const cmd = createToggleCommand({ state, pi: makeMockPi(), onEnable, onDisable });

    await cmd.handler("on", { ui: { notify: vi.fn() } });

    expect(state.mode).toBe("waiting");
    expect(onEnable).toHaveBeenCalledOnce();
    expect(onDisable).not.toHaveBeenCalled();
  });

  it("should disable verifier mode on 'off'", async () => {
    const state = makeMockState();
    state.mode = "waiting";
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    const cmd = createToggleCommand({ state, pi: makeMockPi(), onEnable, onDisable });

    await cmd.handler("off", { ui: { notify: vi.fn() } });

    expect(state.mode).toBe("off");
    expect(onDisable).toHaveBeenCalledOnce();
    expect(onEnable).not.toHaveBeenCalled();
  });

  it("should warn when enabling already-enabled mode", async () => {
    const state = makeMockState();
    state.mode = "waiting";
    const notify = vi.fn();
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    });

    await cmd.handler("on", { ui: { notify } });

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Already enabled"), "warning");
    expect(state.mode).toBe("waiting");
  });

  it("should show usage for invalid args", async () => {
    const state = makeMockState();
    const notify = vi.fn();
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    });

    await cmd.handler("invalid", { ui: { notify } });

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Usage"), "info");
  });
});
