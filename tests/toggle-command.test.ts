import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createToggleCommand } from "../src/toggle-command.js";
import { makeMockState, makeMockPi, makeMockCommandCtx } from "./mocks/fixtures.js";
import type { ExtensionCommandContext } from "../src/types.js";

describe("toggle-command", () => {
  it("should enable verifier mode on 'on'", async () => {
    const state = makeMockState();
    const onEnable = vi.fn();
    const onDisable = vi.fn();
    const cmd = createToggleCommand({ state, pi: makeMockPi(), onEnable, onDisable });

    await cmd.handler("on", makeMockCommandCtx());

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

    await cmd.handler("off", makeMockCommandCtx());

    expect(state.mode).toBe("off");
    expect(onDisable).toHaveBeenCalledOnce();
    expect(onEnable).not.toHaveBeenCalled();
  });

  it("should warn when enabling already-enabled mode", async () => {
    const state = makeMockState();
    state.mode = "waiting";
    const notify = vi.fn();
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
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
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
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
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
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
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
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
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
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

  it("/verify report calls onReport when enabled", async () => {
    const onReport = vi.fn();
    const deps = {
      state: makeMockState({ mode: "active" }),
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume: vi.fn(),
      onReport,
    };
    const cmd = createToggleCommand(deps);
    const ctx = makeMockCommandCtx();
    await cmd.handler("report", ctx);
    expect(onReport).toHaveBeenCalledWith(ctx);
  });

  it("/verify report warns when disabled", async () => {
    const state = makeMockState({ mode: "off" });
    const notify = vi.fn();
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume: vi.fn(),
      onReport: vi.fn(),
    });

    await cmd.handler("report", ctx);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("No active session"), "warning");
  });

  it("/verify launch calls onLaunch when enabled", async () => {
    const onLaunch = vi.fn();
    const deps = {
      state: makeMockState({ mode: "active" }),
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume: vi.fn(),
      onReport: vi.fn(),
      onLaunch,
    };
    const cmd = createToggleCommand(deps);
    const ctx = makeMockCommandCtx();
    await cmd.handler("launch", ctx);
    expect(onLaunch).toHaveBeenCalledWith(ctx);
  });

  it("/verify launch warns when disabled", async () => {
    const state = makeMockState({ mode: "off" });
    const notify = vi.fn();
    const ctx = fromPartial<ExtensionCommandContext>({
      ...makeMockCommandCtx(),
      ui: { ...makeMockCommandCtx().ui, notify },
    });
    const cmd = createToggleCommand({
      state,
      pi: makeMockPi(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onResume: vi.fn(),
      onReport: vi.fn(),
      onLaunch: vi.fn(),
    });

    await cmd.handler("launch", ctx);

    expect(notify).toHaveBeenCalledWith(expect.stringContaining("not running"), "warning");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("/verify on"), "warning");
  });
});
