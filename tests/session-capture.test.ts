import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type {
  InputEvent,
  SessionStartEvent,
  TurnEndEvent,
  BeforeAgentStartEvent,
} from "../src/types.js";

describe("session-capture", () => {
  it("should not broadcast when mode is off", () => {
    const state = makeMockState();
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turnIndex: 1 }), makeMockCtx());
    expect(state.buffer.length).toBe(0);
  });

  it("should broadcast turn_end as stop when mode is waiting", () => {
    const state = makeMockState({ mode: "waiting", currentTurnGenuine: true, turnIndex: 1 });
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turnIndex: 1 }), makeMockCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("stop");
    expect((state.buffer[0]!.data as { turnIndex: number }).turnIndex).toBe(1);
  });

  it("should broadcast session_start when mode is waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });

    hooks.sessionStartHandler(
      fromAny<SessionStartEvent, unknown>({ reason: "startup" }),
      makeMockCtx(),
    );
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("session_start");
  });

  it("should track injectedNext on extension input", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler(
      fromAny<InputEvent, unknown>({ text: "hello", source: "extension" }),
      makeMockCtx(),
    );
    expect(state.injectedNext).toBe(true);
    expect(state.lastUserPrompt).toBeUndefined();
    expect(state.buffer.length).toBe(0);
  });

  it("should track lastUserPrompt on interactive input", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler(
      fromAny<InputEvent, unknown>({ text: "build feature", source: "interactive" }),
      makeMockCtx(),
    );
    expect(state.injectedNext).toBe(false);
    expect(state.lastUserPrompt).toBe("build feature");
    expect(state.buffer.length).toBe(0);
  });

  it("beforeAgentStart resets verificationAttempts for genuine turns", () => {
    const state = makeMockState({ mode: "waiting", injectedNext: false, verificationAttempts: 2 });
    const hooks = createSessionCaptureHooks({ state });

    hooks.beforeAgentStartHandler(
      fromAny<BeforeAgentStartEvent, unknown>({ prompt: "hi" }),
      makeMockCtx(),
    );
    expect(state.verificationAttempts).toBe(0);
    expect(state.turnIndex).toBe(1);
    expect(state.currentTurnGenuine).toBe(true);
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("start");
  });

  it("beforeAgentStart skips injected turns", () => {
    const state = makeMockState({
      mode: "waiting",
      injectedNext: true,
      verificationAttempts: 2,
      turnIndex: 3,
    });
    const hooks = createSessionCaptureHooks({ state });

    hooks.beforeAgentStartHandler(
      fromAny<BeforeAgentStartEvent, unknown>({ prompt: "fix" }),
      makeMockCtx(),
    );
    expect(state.injectedNext).toBe(false);
    expect(state.currentTurnGenuine).toBe(false);
    expect(state.verificationAttempts).toBe(2); // not reset
    expect(state.turnIndex).toBe(3); // not incremented
    expect(state.buffer.length).toBe(0);
  });

  it("should call onTurnEnd callback when provided", () => {
    const state = makeMockState({ mode: "waiting", currentTurnGenuine: true, turnIndex: 1 });
    const onTurnEnd = vi.fn();
    const hooks = createSessionCaptureHooks({ state, onTurnEnd });
    const event = fromAny<TurnEndEvent, unknown>({ turnIndex: 1 });
    const ctx = makeMockCtx();
    hooks.turnEndHandler(event, ctx);
    expect(onTurnEnd).toHaveBeenCalledWith(event);
  });

  it("should not broadcast session_start when mode is off", () => {
    const state = makeMockState({ mode: "off" });
    const hooks = createSessionCaptureHooks({ state });
    hooks.sessionStartHandler(
      fromAny<SessionStartEvent, unknown>({ reason: "startup" }),
      makeMockCtx(),
    );
    expect(state.buffer.length).toBe(0);
  });

  it("should not broadcast input", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });
    hooks.inputHandler(
      fromAny<InputEvent, unknown>({ text: "hello", source: "interactive" }),
      makeMockCtx(),
    );
    expect(state.buffer.length).toBe(0);
  });
});
