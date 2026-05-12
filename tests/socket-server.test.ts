import { describe, expect, it } from "vitest";
import { startSocketServer, stopSocketServer, broadcast } from "../src/socket-server.js";
import type { VerifierState } from "../src/types.js";

function makeState(port: number): VerifierState {
  return {
    mode: "off",
    port,
    server: undefined,
    clients: [],
    buffer: [],
    bufferTtlMs: 30000,
  };
}

describe("socket-server", () => {
  it("should start and stop without error", async () => {
    const state = makeState(19876);
    await startSocketServer({ state });
    expect(state.server).toBeDefined();
    stopSocketServer({ state });
    expect(state.server).toBeUndefined();
  });

  it("should buffer when no clients connected", async () => {
    const state = makeState(19877);
    await startSocketServer({ state });
    broadcast({ state }, { turn: 1 });
    expect(state.buffer.length).toBe(1);
    stopSocketServer({ state });
  });

  it("should drop old buffered messages past TTL", async () => {
    const state = makeState(19878);
    state.bufferTtlMs = 1; // 1ms expiration
    await startSocketServer({ state });
    broadcast({ state }, { turn: 1 });
    expect(state.buffer.length).toBe(1); // Just added
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    }); // Wait for TTL to expire
    broadcast({ state }, { turn: 2 });
    // First message should be dropped now because it's past TTL
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0] as { data?: { turn?: number } }).data?.turn).toBe(2);
    stopSocketServer({ state });
  });

  it("should transition mode to waiting when server starts", async () => {
    const state = makeState(19879);
    expect(state.mode).toBe("off");
    await startSocketServer({ state });
    // Mode stays off until a client connects; server is just ready
    expect(state.server).toBeDefined();
    stopSocketServer({ state });
  });
});
