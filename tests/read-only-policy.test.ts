import { fromPartial } from "@total-typescript/shoehorn";
import { describe, it, expect } from "vitest";
import { createReadOnlyPolicy } from "../src/read-only-policy.js";
import type { VerifierState, ExtensionContext } from "../src/types.js";
import type { ToolCallEvent } from "@earendil-works/pi-coding-agent";

function makeState(mode: VerifierState["mode"]): VerifierState {
  return {
    mode,
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
  };
}

function makeEvent(toolName: string): ToolCallEvent {
  return fromPartial<ToolCallEvent>({ type: "tool_call", toolCallId: "tc-1", toolName, input: {} });
}

const ctx = fromPartial<ExtensionContext>({});

describe("read-only policy", () => {
  it("allows all tools when verification is off", () => {
    const policy = createReadOnlyPolicy({ state: makeState("off") });
    expect(policy.toolCallHandler(makeEvent("write"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("bash"), ctx)).toEqual({});
  });

  it("blocks write, edit, and bash when active", () => {
    const policy = createReadOnlyPolicy({ state: makeState("active") });
    expect(policy.toolCallHandler(makeEvent("write"), ctx)).toHaveProperty("block", true);
    expect(policy.toolCallHandler(makeEvent("edit"), ctx)).toHaveProperty("block", true);
    expect(policy.toolCallHandler(makeEvent("bash"), ctx)).toHaveProperty("block", true);
  });

  it("allows read, grep, find, ls when active", () => {
    const policy = createReadOnlyPolicy({ state: makeState("active") });
    expect(policy.toolCallHandler(makeEvent("read"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("grep"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("find"), ctx)).toEqual({});
    expect(policy.toolCallHandler(makeEvent("ls"), ctx)).toEqual({});
  });
});
