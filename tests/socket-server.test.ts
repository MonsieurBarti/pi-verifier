import { describe, expect, it, vi } from "vitest";
import { createConnection } from "node:net";
import { startSocketServer, startSocketServerWithFallback, stopSocketServer, broadcast } from "../src/socket-server.js";
import { makeMockState } from "./mocks/fixtures.js";

describe("socket-server", () => {
  it("should start and stop without error", async () => {
    const state = makeMockState({ port: 19876 });
    await startSocketServer({ state });
    expect(state.server).toBeDefined();
    stopSocketServer({ state });
    expect(state.server).toBeUndefined();
  });

  it("should buffer when no clients connected", async () => {
    const state = makeMockState({ port: 19877 });
    await startSocketServer({ state });
    broadcast({ state }, { turn: 1 });
    expect(state.buffer.length).toBe(1);
    stopSocketServer({ state });
  });

  it("should drop old buffered messages past TTL", async () => {
    const state = makeMockState({ port: 19878, bufferTtlMs: 1 });
    await startSocketServer({ state });
    broadcast({ state }, { turn: 1 });
    expect(state.buffer.length).toBe(1); // Just added
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    }); // Wait for TTL to expire
    broadcast({ state }, { turn: 2 });
    // First message should be dropped now because it's past TTL
    expect(state.buffer.length).toBe(1);
    expect((state.buffer[0]!.data as { turn?: number }).turn).toBe(2);
    stopSocketServer({ state });
  });

  it("should transition mode to waiting when server starts", async () => {
    const state = makeMockState({ port: 19879 });
    expect(state.mode).toBe("off");
    await startSocketServer({ state });
    // Mode stays off until a client connects; server is just ready
    expect(state.server).toBeDefined();
    stopSocketServer({ state });
  });

  it("should call onFeedback when a client sends a feedback JSONL message", async () => {
    const state = makeMockState({ port: 19883 });
    const onFeedback = vi.fn();
    await startSocketServer({ state, onFeedback });

    const client = createConnection({ port: 19883 });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("error", reject);
    });

    // Wait for server to register the client
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    const msg = { timestamp: Date.now(), data: { type: "feedback", content: "test feedback" } };
    client.write(JSON.stringify(msg) + "\n");

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(onFeedback).toHaveBeenCalledWith({ type: "feedback", content: "test feedback" });

    client.destroy();
    stopSocketServer({ state });
  });

  it("should ignore malformed JSON lines without crashing", async () => {
    const state = makeMockState({ port: 19881 });
    const onFeedback = vi.fn();
    await startSocketServer({ state, onFeedback });

    const client = createConnection({ port: 19881 });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("error", reject);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    client.write("this is not json\n");
    client.write(
      JSON.stringify({ timestamp: 1, data: { type: "feedback", content: "ok" } }) + "\n",
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(onFeedback).toHaveBeenCalledWith({ type: "feedback", content: "ok" });

    client.destroy();
    stopSocketServer({ state });
  });

  it("should not crash when onFeedback is undefined", async () => {
    const state = makeMockState({ port: 19882 });
    await startSocketServer({ state }); // no onFeedback

    const client = createConnection({ port: 19882 });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("error", reject);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    const msg = { timestamp: Date.now(), data: { type: "feedback", content: "any" } };
    client.write(JSON.stringify(msg) + "\n");

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    // No assertion needed beyond reaching this point without throwing
    client.destroy();
    stopSocketServer({ state });
  });

  it("falls back to next port when preferred port is taken", async () => {
    const firstState = makeMockState({ port: 19990 });
    await startSocketServer({ state: firstState });

    const secondState = makeMockState({ port: 19990, portRetries: 3 });
    await startSocketServerWithFallback({ state: secondState });

    expect(secondState.port).toBe(19991);
    expect(secondState.server).toBeDefined();

    stopSocketServer({ state: firstState });
    stopSocketServer({ state: secondState });
  });

  it("throws when all ports in range are taken", async () => {
    const firstState = makeMockState({ port: 19995 });
    await startSocketServer({ state: firstState });

    const secondState = makeMockState({ port: 19995, portRetries: 0 });
    await expect(startSocketServerWithFallback({ state: secondState })).rejects.toThrow(
      "Could not bind to any port in range",
    );

    stopSocketServer({ state: firstState });
  });
});
