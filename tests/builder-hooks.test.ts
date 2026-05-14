import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import { createReadOnlyPolicy } from "../src/read-only-policy.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type {
  TurnEndEvent,
  InputEvent,
  SessionStartEvent,
  BeforeAgentStartEvent,
  ExtensionContext,
} from "../src/types.js";
import type { ToolCallEvent } from "@earendil-works/pi-coding-agent";

describe("builder hooks integration", () => {
  it("full lifecycle: session_start → before_agent_start → turn_end with state waiting", () => {
    const state = makeMockState({ mode: "waiting" });
    const hooks = createSessionCaptureHooks({ state });
    const ctx = makeMockCtx();

    hooks.sessionStartHandler(fromAny<SessionStartEvent, unknown>({ reason: "startup" }), ctx);
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("session_start");

    // Genuine user input
    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello", source: "interactive" }), ctx);
    expect(state.buffer.length).toBe(1); // input no longer broadcasts

    hooks.beforeAgentStartHandler(
      fromAny<BeforeAgentStartEvent, unknown>({ prompt: "hello" }),
      ctx,
    );
    expect(state.buffer.length).toBe(2);
    expect((state.buffer[1]!.data as { type: string }).type).toBe("start");

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turnIndex: 1 }), ctx);
    expect(state.buffer.length).toBe(3);
    expect((state.buffer[2]!.data as { type: string }).type).toBe("stop");
  });

  it("injected turn lifecycle: input(extension) → before_agent_start(skip) → turn_end(skip broadcast)", () => {
    const state = makeMockState({ mode: "waiting", injectedNext: true });
    const hooks = createSessionCaptureHooks({ state });
    const ctx = makeMockCtx();

    hooks.beforeAgentStartHandler(fromAny<BeforeAgentStartEvent, unknown>({ prompt: "fix" }), ctx);
    expect(state.buffer.length).toBe(0);
    expect(state.currentTurnGenuine).toBe(false);

    // turn_end still broadcasts because the builder broadcasts all stops
    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turnIndex: 1 }), ctx);
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { type: string }).type).toBe("stop");
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
