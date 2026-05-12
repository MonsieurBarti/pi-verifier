import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import type {
  ExtensionContext,
  InputEvent,
  SessionStartEvent,
  TurnEndEvent,
  VerifierState,
} from "../src/types.js";

const makeState = (): VerifierState => ({
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

const makeCtx = (): ExtensionContext =>
  fromPartial<ExtensionContext>({
    ui: { notify: vi.fn(), setStatus: vi.fn() },
    cwd: "/tmp",
  });

describe("session-capture", () => {
  it("should not broadcast when mode is off", () => {
    const state = makeState();
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ some: "event" }), makeCtx());
    expect(state.buffer.length).toBe(0);
  });

  it("should broadcast turn_end when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler(fromAny<TurnEndEvent, unknown>({ turn: 1 }), makeCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("turn_end");
  });

  it("should broadcast session_start when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.sessionStartHandler(
      fromAny<SessionStartEvent, unknown>({ reason: "startup" }),
      makeCtx(),
    );
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("session_start");
  });

  it("should broadcast input when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello" }), makeCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("input");
  });

  it("should call onTurnEnd callback when provided", () => {
    const state = makeState();
    state.mode = "waiting";
    const onTurnEnd = vi.fn();
    const hooks = createSessionCaptureHooks({ state, onTurnEnd });
    const event = fromAny<TurnEndEvent, unknown>({ turn: 1 });
    const ctx = makeCtx();
    hooks.turnEndHandler(event, ctx);
    expect(onTurnEnd).toHaveBeenCalledWith(event);
  });

  it("should not broadcast session_start when mode is off", () => {
    const state = makeState();
    state.mode = "off";
    const hooks = createSessionCaptureHooks({ state });
    hooks.sessionStartHandler(
      fromAny<SessionStartEvent, unknown>({ reason: "startup" }),
      makeCtx(),
    );
    expect(state.buffer.length).toBe(0);
  });

  it("should not broadcast input when mode is off", () => {
    const state = makeState();
    state.mode = "off";
    const hooks = createSessionCaptureHooks({ state });
    hooks.inputHandler(fromAny<InputEvent, unknown>({ text: "hello" }), makeCtx());
    expect(state.buffer.length).toBe(0);
  });
});
