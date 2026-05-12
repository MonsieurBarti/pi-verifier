import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

const mockSockets: (EventEmitter & { write: ReturnType<typeof vi.fn> })[] = [];
const mockInterfaces: EventEmitter[] = [];

vi.mock("node:net", () => ({
  createConnection: vi.fn(() => {
    // eslint-disable-next-line unicorn/prefer-event-target
    const socket = fromAny<EventEmitter & { write: ReturnType<typeof vi.fn> }, unknown>(
      new EventEmitter(),
    );
    socket.write = vi.fn(() => true);
    mockSockets.push(socket);
    return socket;
  }),
}));

vi.mock("node:readline", () => ({
  createInterface: vi.fn(() => {
    // eslint-disable-next-line unicorn/prefer-event-target
    const rl = new EventEmitter();
    mockInterfaces.push(rl);
    return rl;
  }),
}));

vi.mock("@earendil-works/pi-coding-agent", () => {
  const session = {
    subscribe: vi.fn((cb: (event: unknown) => void) => {
      (session as typeof session & { subscriberRef: typeof cb }).subscriberRef = cb;
      return vi.fn();
    }),
    prompt: vi.fn(async (_text: string) => {
      await Promise.resolve();
      const sub = (session as typeof session & { subscriberRef?: (event: unknown) => void })
        .subscriberRef;
      sub?.({ type: "agent_end" });
    }),
    messages: [
      {
        role: "assistant",
        content: [{ type: "text", text: "Looks good to me" }],
      },
    ],
    getActiveToolNames: vi.fn(() => ["read", "grep", "find", "ls"]),
  };
  return {
    createAgentSession: vi.fn(() => Promise.resolve({ session })),
  };
});

// Prevent process.exit from killing vitest during verifier module load
vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

// Import verifier — side effects run with mocks in place
const verifierPromise = import("../src/verifier.js");

async function waitForVerifierInit(): Promise<void> {
  await verifierPromise;
  // Allow initSession microtasks to complete
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 10);
  });
}

describe("verifier daemon", () => {
  it("should connect to builder TCP server", async () => {
    await waitForVerifierInit();
    const { createConnection } = await import("node:net");
    expect(createConnection).toHaveBeenCalledWith({ port: 9876, host: "127.0.0.1" });
  });

  it("should create an AgentSession with read-only tools", async () => {
    await waitForVerifierInit();
    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    expect(createAgentSession).toHaveBeenCalledWith({
      noTools: "all",
      tools: ["read", "grep", "find", "ls"],
    });
  });

  it("should handle turn_end and send feedback", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;
    const socket = mockSockets[0]!;

    expect(rl).toBeDefined();
    expect(socket).toBeDefined();

    // Simulate receiving a turn_end message from builder
    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "test" }, toolResults: [] },
      },
    });

    rl.emit("line", turnEndMsg);

    // Wait for async prompt and feedback
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 10);
    });

    expect(socket.write).toHaveBeenCalled();

    // Check that the written data is a feedback IPC message
    const writeCall = fromAny<[string], unknown>(socket.write.mock.calls[0]);
    const written = JSON.parse(writeCall[0]) as { data: { type: string; content: string } };
    expect(written.data.type).toBe("feedback");
    expect(written.data.content).toBe("Looks good to me");
  });

  it("should ignore malformed JSON lines", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;
    const socket = mockSockets[0]!;
    const writeCallsBefore = socket.write.mock.calls.length;

    rl.emit("line", "not valid json {{{");

    expect(socket.write.mock.calls.length).toBe(writeCallsBefore);
  });
});
