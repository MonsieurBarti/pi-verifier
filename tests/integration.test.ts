import { describe, expect, it, vi } from "vitest";
import { createConnection } from "node:net";
import verifierExtension from "../src/index.js";
import { makeMockPi, makeMockCtx, makeMockCommandCtx } from "./mocks/fixtures.js";
import type { TurnEndEvent, SessionStartEvent } from "../src/types.js";

describe("E2E: builder ↔ verifier loop", () => {
  it(
    "full loop: enable → session_start → turn_end → mock verifier feedback → followUp injected",
    async () => {
      const pi = makeMockPi();
      verifierExtension(pi);

      // Extract command handler
      const cmdCall = vi.mocked(pi.registerCommand).mock.calls.find((c) => c[0] === "verify");
      expect(cmdCall).toBeDefined();
      const cmdHandler = cmdCall![1].handler as (args: string, ctx: unknown) => Promise<void>;

      // Enable verifier
      const ctx = makeMockCommandCtx();
      await cmdHandler("on", ctx);

      // Extract session_start handler
      const startHandler = vi.mocked(pi.on).mock.calls.find(
        (c) => c[0] === "session_start",
      )?.[1] as (event: SessionStartEvent, ctx: unknown) => void;

      const sessionCtx = makeMockCtx();
      startHandler?.({ reason: "startup" } as SessionStartEvent, sessionCtx);

      // Wait for server to be ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Connect mock verifier client
      const client = createConnection({ port: 9876 });
      await new Promise<void>((resolve, reject) => {
        client.on("connect", resolve);
        client.on("error", reject);
      });

      // Wait for client registration
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send a turn_end event
      const turnEndHandler = vi.mocked(pi.on).mock.calls.find(
        (c) => c[0] === "turn_end",
      )?.[1] as (event: TurnEndEvent, ctx: unknown) => void;

      turnEndHandler?.({ turn: 1 } as TurnEndEvent, sessionCtx);

      // Wait for event to reach client
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send mock verifier feedback back
      const feedbackMsg = JSON.stringify({
        timestamp: Date.now(),
        data: { type: "feedback", content: "Looks good to me" },
      });
      client.write(feedbackMsg + "\n");

      // Wait for feedback processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify feedback was injected
      expect(pi.sendUserMessage).toHaveBeenCalledWith(
        "🔍 **Verifier feedback:**\nLooks good to me",
        expect.objectContaining({ deliverAs: "followUp" }),
      );

      // Cleanup
      client.end();
      const offCtx = makeMockCommandCtx();
      await cmdHandler("off", offCtx);
    },
    10000,
  );
});
