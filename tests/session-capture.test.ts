import { describe, expect, it } from "vitest";
import { createSessionCaptureHooks } from "../src/session-capture.js";
import type { VerifierState } from "../src/types.js";

function makeState(): VerifierState {
  return {
    mode: "off",
    port: 9876,
    server: undefined,
    clients: [],
    buffer: [],
    bufferTtlMs: 30000,
  };
}

describe("session-capture", () => {
  it("should not broadcast when mode is off", () => {
    const state = makeState();
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler({ some: "event" }, {});
    expect(state.buffer.length).toBe(0);
  });

  it("should broadcast turn_end when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.turnEndHandler({ turn: 1 }, {});
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("turn_end");
  });

  it("should broadcast session_start when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.sessionStartHandler({}, {});
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("session_start");
  });

  it("should broadcast input when mode is waiting", () => {
    const state = makeState();
    state.mode = "waiting";
    const hooks = createSessionCaptureHooks({ state });

    hooks.inputHandler({ text: "hello" }, {});
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { type?: string } }).data?.type).toBe("input");
  });
});
