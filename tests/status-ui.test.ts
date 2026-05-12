import { describe, expect, it } from "vitest";
import { formatStatus } from "../src/status-ui.js";
import type { VerifierState } from "../src/types.js";

function makeState(mode: VerifierState["mode"]): VerifierState {
  return { mode, port: 9876, server: undefined, clients: [], buffer: [], bufferTtlMs: 30000 };
}

describe("status-ui", () => {
  it("should format off state", () => {
    expect(formatStatus(makeState("off"))).toBe("🔍 Verifier: off");
  });

  it("should format waiting state", () => {
    expect(formatStatus(makeState("waiting"))).toBe("🔍 Verifier: waiting");
  });

  it("should format active state", () => {
    expect(formatStatus(makeState("active"))).toBe("🔍 Verifier: active");
  });
});
