import { describe, it, expect } from "vitest";
import { createVerifierPromptTool } from "../src/verifier-prompt-tool.js";
import { makeMockState, makeMockCtx } from "./mocks/fixtures.js";

describe("verifier_prompt tool", () => {
  it("returns inactive message when verification is off", async () => {
    const tool = createVerifierPromptTool({ state: makeMockState({ mode: "off" }) });
    const ctx = makeMockCtx();
    const result = await tool.execute("tc-1", {}, undefined, undefined, ctx);
    expect(result.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("not active"),
    });
  });

  it("returns active message and notifies when verification is active", async () => {
    const tool = createVerifierPromptTool({ state: makeMockState({ mode: "active" }) });
    const ctx = makeMockCtx();
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
    const tool = createVerifierPromptTool({ state: makeMockState({ mode: "active" }) });
    expect(tool.name).toBe("verifier_prompt");
    expect(tool.parameters.type).toBe("object");
    expect(tool.parameters.properties).toHaveProperty("reason");
    expect(tool.parameters.additionalProperties).toBe(false);
  });
});
