import { fromPartial } from "@total-typescript/shoehorn";
import { describe, it, expect, vi } from "vitest";
import { createVerifierPromptTool } from "../src/verifier-prompt-tool.js";
import type { VerifierState, ExtensionContext } from "../src/types.js";

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

const ctx = fromPartial<ExtensionContext>({ ui: { notify: vi.fn() } });

describe("verifier_prompt tool", () => {
  it("returns inactive message when verification is off", async () => {
    const tool = createVerifierPromptTool({ state: makeState("off") });
    const result = await tool.execute("tc-1", {}, undefined, undefined, ctx);
    expect(result.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("not active"),
    });
  });

  it("returns active message and notifies when verification is active", async () => {
    const tool = createVerifierPromptTool({ state: makeState("active") });
    const result = await tool.execute(
      "tc-1",
      { reason: "check my refactor" },
      undefined,
      undefined,
      ctx,
    );
    expect(result.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("active and monitoring"),
    });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("On-demand verification"),
      "info",
    );
  });

  it("has correct TypeBox schema with optional reason", () => {
    const tool = createVerifierPromptTool({ state: makeState("active") });
    expect(tool.name).toBe("verifier_prompt");
    expect(tool.parameters.type).toBe("object");
    expect(tool.parameters.properties).toHaveProperty("reason");
    expect(tool.parameters.additionalProperties).toBe(false);
  });
});
