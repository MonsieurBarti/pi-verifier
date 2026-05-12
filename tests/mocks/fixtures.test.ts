import { describe, expect, it } from "vitest";
import { makeMockState, makeMockPi, makeMockCtx } from "./fixtures.js";

describe("mock fixtures", () => {
  it("makeMockState returns valid default state", () => {
    const state = makeMockState();
    expect(state.mode).toBe("off");
    expect(state.port).toBe(9876);
    expect(state.clients).toEqual([]);
  });

  it("makeMockState applies overrides", () => {
    const state = makeMockState({ mode: "active", port: 19999 });
    expect(state.mode).toBe("active");
    expect(state.port).toBe(19999);
  });

  it("makeMockPi returns mock with required methods", () => {
    const pi = makeMockPi();
    expect(typeof pi.on).toBe("function");
    expect(typeof pi.registerCommand).toBe("function");
    expect(typeof pi.registerTool).toBe("function");
    expect(typeof pi.sendUserMessage).toBe("function");
  });

  it("makeMockCtx returns mock with UI methods", () => {
    const ctx = makeMockCtx();
    expect(typeof ctx.ui.setStatus).toBe("function");
    expect(typeof ctx.ui.notify).toBe("function");
  });
});
