import { describe, expect, it, vi } from "vitest";
import { createToggleCommand } from "../src/toggle-command.js";
import type { ExtensionAPI, ExtensionCommandContext, VerifierState } from "../src/types.js";

const makeMockState = (): VerifierState => ({
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

const makeMockPi = (): ExtensionAPI =>
  ({
    cwd: "/tmp",
    exec: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
  }) as unknown as ExtensionAPI;

const makeMockCtx = (): ExtensionCommandContext =>
  ({
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
    },
    cwd: "/tmp",
  }) as unknown as ExtensionCommandContext;

describe("toggle-command", () => {
  it("should enable verifier mode on 'on'", async () => {
    const state = makeMockState();
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    const cmd = createToggleCommand({ state, pi: makeMockPi(), onEnable, onDisable });

    await cmd.handler("on", makeMockCtx());

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

    await cmd.handler("off", makeMockCtx());

    expect(state.mode).toBe("off");
    expect(onDisable).toHaveBeenCalledOnce();
    expect(onEnable).not.toHaveBeenCalled();
  });

  it("should warn when enabling already-enabled mode", async () => {
    const state = makeMockState();
    state.mode = "waiting";
    const notify = vi.fn();
    const ctx = {
      ...makeMockCtx(),
      ui: { ...makeMockCtx().ui, notify },
    } as unknown as ExtensionCommandContext;
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    });

    await cmd.handler("on", ctx);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Already enabled"), "warning");
    expect(state.mode).toBe("waiting");
  });

  it("should show usage for invalid args", async () => {
    const state = makeMockState();
    const notify = vi.fn();
    const ctx = {
      ...makeMockCtx(),
      ui: { ...makeMockCtx().ui, notify },
    } as unknown as ExtensionCommandContext;
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    });

    await cmd.handler("invalid", ctx);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Usage"), "info");
  });

  it("should resume when paused", async () => {
    const state = makeMockState();
    state.escalationPaused = true;
    const onResume = vi.fn();
    const notify = vi.fn();
    const ctx = {
      ...makeMockCtx(),
      ui: { ...makeMockCtx().ui, notify },
    } as unknown as ExtensionCommandContext;
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume,
    });

    await cmd.handler("resume", ctx);

    expect(onResume).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("resumed"), "info");
  });

  it("should notify when resume called but not paused", async () => {
    const state = makeMockState();
    state.escalationPaused = false;
    const onResume = vi.fn();
    const notify = vi.fn();
    const ctx = {
      ...makeMockCtx(),
      ui: { ...makeMockCtx().ui, notify },
    } as unknown as ExtensionCommandContext;
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume,
    });

    await cmd.handler("resume", ctx);

    expect(onResume).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("not paused"), "info");
  });

  it("should warn when disabling already-disabled mode", async () => {
    const state = makeMockState();
    state.mode = "off";
    const notify = vi.fn();
    const ctx = {
      ...makeMockCtx(),
      ui: { ...makeMockCtx().ui, notify },
    } as unknown as ExtensionCommandContext;
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    });

    await cmd.handler("off", ctx);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Already disabled"), "warning");
    expect(state.mode).toBe("off");
  });
});
