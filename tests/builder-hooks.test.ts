import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import { createReadOnlyPolicy } from "../src/read-only-policy.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type { TurnEndEvent, InputEvent, SessionStartEvent } from "../src/types.js";

describe("builder hooks integration", () => {
  it("full lifecycle: session_start → input → turn_end with state waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });
    const ctx = makeMockCtx();

    hooks.sessionStartHandler({ reason: "startup" } as SessionStartEvent, ctx);
    expect(state.buffer.length).toBe(1);

    hooks.inputHandler({ text: "hello" } as InputEvent, ctx);
    expect(state.buffer.length).toBe(2);

    hooks.turnEndHandler({ turn: 1 } as TurnEndEvent, ctx);
    expect(state.buffer.length).toBe(3);
  });

  it("tool_call interceptor blocks write when verification active", () => {
    const state = makeMockState({ mode: "active" });
    const policy = createReadOnlyPolicy({ state });
    const result = policy.toolCallHandler(
      { toolName: "write", args: {} } as unknown,
      {} as unknown,
    );
    expect(result).toEqual({
      block: true,
      reason: expect.stringContaining("verification is active"),
    });
  });

  it("tool_call interceptor allows read when verification active", () => {
    const state = makeMockState({ mode: "active" });
    const policy = createReadOnlyPolicy({ state });
    const result = policy.toolCallHandler(
      { toolName: "read", args: {} } as unknown,
      {} as unknown,
    );
    expect(result).toEqual({});
  });

  it("session capture sets lastContext on session_start", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state, onTurnEnd: vi.fn() });
    const ctx = makeMockCtx();
    hooks.sessionStartHandler({ reason: "startup" } as SessionStartEvent, ctx);
    expect(state.lastContext).toBe(ctx);
  });
});
