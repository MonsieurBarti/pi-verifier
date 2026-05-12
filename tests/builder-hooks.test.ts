import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import { createReadOnlyPolicy } from "../src/read-only-policy.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type {
  TurnEndEvent,
  InputEvent,
  SessionStartEvent,
  ExtensionContext,
} from "../src/types.js";
import type { ToolCallEvent } from "@earendil-works/pi-coding-agent";

describe("builder hooks integration", () => {
  it("full lifecycle: session_start → input → turn_end with state waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });
    const ctx = makeMockCtx();

    hooks.sessionStartHandler(fromAny<SessionStartEvent, unknown>({ reason: "startup" }), ctx);
    expect(state.buffer.length).toBe(1);

    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello" }), ctx);
    expect(state.buffer.length).toBe(2);

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turn: 1 }), ctx);
    expect(state.buffer.length).toBe(3);
  });

  it("tool_call interceptor blocks write when verification active", () => {
    const state = makeMockState({ mode: "active" });
    const policy = createReadOnlyPolicy({ state });
    const result = policy.toolCallHandler(
      fromAny<ToolCallEvent, unknown>({
        toolName: "write",
        args: {},
      }),
      fromPartial<ExtensionContext>({}),
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
      fromAny<ToolCallEvent, unknown>({
        toolName: "read",
        args: {},
      }),
      fromPartial<ExtensionContext>({}),
    );
    expect(result).toEqual({});
  });

  it("session capture sets lastContext on session_start", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state, onTurnEnd: vi.fn() });
    const ctx = makeMockCtx();
    hooks.sessionStartHandler(fromAny<SessionStartEvent, unknown>({ reason: "startup" }), ctx);
    expect(state.lastContext).toBe(ctx);
  });
});
