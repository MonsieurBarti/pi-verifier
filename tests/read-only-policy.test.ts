import { fromPartial } from "@total-typescript/shoehorn";
import { describe, it, expect } from "vitest";
import { createReadOnlyPolicy } from "../src/read-only-policy.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";
import type { ToolCallEvent } from "@earendil-works/pi-coding-agent";

function makeEvent(toolName: string): ToolCallEvent {
  return fromPartial<ToolCallEvent>({ type: "tool_call", toolCallId: "tc-1", toolName, input: {} });
}

describe("read-only policy", () => {
  it("allows all tools when verification is off", () => {
    const policy = createReadOnlyPolicy({ state: makeMockState({ mode: "off" }) });
    const ctx = makeMockCtx();
    expect(policy.toolCallHandler(makeEvent("write"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("bash"), ctx)).toEqual({});
  });

  it("blocks write, edit, and bash when active", () => {
    const policy = createReadOnlyPolicy({ state: makeMockState({ mode: "active" }) });
    const ctx = makeMockCtx();
    expect(policy.toolCallHandler(makeEvent("write"), ctx)).toHaveProperty("block", true);
    expect(policy.toolCallHandler(makeEvent("edit"), ctx)).toHaveProperty("block", true);
    expect(policy.toolCallHandler(makeEvent("bash"), ctx)).toHaveProperty("block", true);
  });

  it("allows read, grep, find, ls when active", () => {
    const policy = createReadOnlyPolicy({ state: makeMockState({ mode: "active" }) });
    const ctx = makeMockCtx();
    expect(policy.toolCallHandler(makeEvent("read"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("grep"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("find"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("ls"), ctx)).toEqual({});
  });
});
