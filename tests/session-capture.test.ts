import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type { InputEvent, SessionStartEvent, TurnEndEvent } from "../src/types.js";

describe("session-capture", () => {
  it("should not broadcast when mode is off", () => {
    const state = makeMockState();
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ some: "event" }), makeMockCtx());
    expect(state.buffer.length).toBe(0);
  });

  it("should broadcast turn_end when mode is waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turn: 1 }), makeMockCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("turn_end");
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

  it("should broadcast input when mode is waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello" }), makeMockCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("input");
  });

  it("should call onTurnEnd callback when provided", () => {
    const state = makeMockState({ mode: "waiting" });
    const onTurnEnd = vi.fn();
    const hooks = createSessionCaptureHooks({ state, onTurnEnd });
    const event = fromAny<TurnEndEvent, unknown>({ turn: 1 });
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

  it("should not broadcast input when mode is off", () => {
    const state = makeMockState({ mode: "off" });
    const hooks = createSessionCaptureHooks({ state });
    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello" }), makeMockCtx());
    expect(state.buffer.length).toBe(0);
  });
});
