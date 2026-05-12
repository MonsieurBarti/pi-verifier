import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";
import type { IpcMessage, IpcPayload, TurnEndEvent, InputEvent } from "../src/types.js";

describe("IPC protocol serialization", () => {
  it("turn_end message has correct shape", () => {
    const payload: IpcPayload = {
      type: "turn_end",
      event: fromAny<TurnEndEvent, unknown>({ turn: 1 }),
    };
    const msg: IpcMessage = { timestamp: Date.now(), data: payload };
    const serialized = JSON.stringify(msg);
    const parsed = fromAny<IpcMessage, unknown>(JSON.parse(serialized));
    expect(parsed.data.type).toBe("turn_end");
    expect(parsed.timestamp).toBeTypeOf("number");
  });

  it("feedback message has correct shape", () => {
    const payload: IpcPayload = { type: "feedback", content: "Looks good" };
    const msg: IpcMessage = { timestamp: Date.now(), data: payload };
    const serialized = JSON.stringify(msg);
    const parsed = fromAny<IpcMessage, unknown>(JSON.parse(serialized));
    expect(parsed.data.type).toBe("feedback");
    expect((parsed.data as { content?: string }).content).toBe("Looks good");
  });

  it("session_start message has correct shape", () => {
    const payload: IpcPayload = { type: "session_start" };
    const msg: IpcMessage = { timestamp: 12345, data: payload };
    expect(msg.timestamp).toBe(12345);
    expect(msg.data.type).toBe("session_start");
  });

  it("input message has correct shape", () => {
    const payload: IpcPayload = {
      type: "input",
      event: fromAny<InputEvent, unknown>({ text: "hello" }),
    };
    const msg: IpcMessage = { timestamp: 0, data: payload };
    expect(msg.data.type).toBe("input");
  });

  it("JSONL line is single-line JSON", () => {
    const msg: IpcMessage = { timestamp: 1, data: { type: "session_start" } };
    const line = JSON.stringify(msg);
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toEqual(msg);
  });
});
