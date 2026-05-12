import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext, VerifierState } from "./types.js";

export interface VerifierPromptToolDeps {
  state: VerifierState;
}

const parameters = Type.Object(
  {
    // oxlint-disable-next-line new-cap
    reason: Type.Optional(
      Type.String({ description: "Optional reason for requesting verification" }),
    ),
  },
  { additionalProperties: false },
);

export function createVerifierPromptTool(
  deps: VerifierPromptToolDeps,
): ToolDefinition<typeof parameters> {
  const { state } = deps;

  return {
    name: "verifier_prompt",
    label: "Verifier Prompt",
    description:
      "Request immediate attention from the verifier subagent. Use this when you want the verifier to double-check your recent work.",
    parameters,
    // oxlint-disable-next-line max-params
    execute: (_toolCallId, params, _signal, _onUpdate, ctx: ExtensionContext) => {
      if (state.mode !== "active") {
        return Promise.resolve({
          content: [
            {
              type: "text",
              text: "Verifier is not active. Use /verify on to enable verification.",
            },
          ],
          details: {},
        });
      }
      let reasonText = "";
      if (params.reason) {
        reasonText = ` (reason: ${params.reason})`;
      }
      ctx.ui.notify(`[pi-verifier] On-demand verification requested${reasonText}.`, "info");
      return Promise.resolve({
        content: [
          { type: "text", text: `Verifier is active and monitoring this session.${reasonText}` },
        ],
        details: {},
      });
    },
  };
}
