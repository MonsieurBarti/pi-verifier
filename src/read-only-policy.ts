import type { ExtensionContext, VerifierState } from "./types.js";
import type { ToolCallEvent, ToolCallEventResult } from "@earendil-works/pi-coding-agent";

export interface ReadOnlyPolicyDeps {
  state: VerifierState;
}

const DANGEROUS_TOOLS = new Set(["write", "edit", "bash"]);

export function createReadOnlyPolicy(deps: ReadOnlyPolicyDeps) {
  const { state } = deps;

  return {
    toolCallHandler: (event: ToolCallEvent, _ctx: ExtensionContext): ToolCallEventResult => {
      if (state.mode !== "active") return {};
      if (DANGEROUS_TOOLS.has(event.toolName)) {
        return {
          block: true,
          reason: `[pi-verifier] Blocked ${event.toolName} because verification is active. Use /verify off to disable verification if you need to mutate files.`,
        };
      }
      return {};
    },
  };
}
