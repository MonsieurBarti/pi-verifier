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
  ({
    ui: { notify: vi.fn(), setStatus: vi.fn() },
    cwd: "/tmp",
  }) as unknown as ExtensionContext;

describe("session-capture", () => {
  it("should not broadcast when mode is off", () => {
    const state = makeState();
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler({ some: "event" } as unknown as TurnEndEvent, makeCtx());
    expect(state.buffer.length).toBe(0);
  });

  it("should broadcast turn_end when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler({ turn: 1 } as unknown as TurnEndEvent, makeCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("turn_end");
  });

  it("should broadcast session_start when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.sessionStartHandler({ reason: "startup" } as unknown as SessionStartEvent, makeCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("session_start");
  });

  it("should broadcast input when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler({ text: "hello" } as unknown as InputEvent, makeCtx());
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("input");
  });
});
