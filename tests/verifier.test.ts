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

  it("accumulates session history across turns", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    // Access the mock session to inspect prompt calls
    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear any history from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // First turn
    const turnEndMsg1 = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "turn 1" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg1);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Second turn
    const turnEndMsg2 = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "turn 2" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg2);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(2);
    expect(promptCalls[0]![0]).not.toContain("Session history");
    expect(promptCalls[1]![0]).toContain("Session history (1 prior turn)");
  });

  it("clears session history on session_start", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear any history from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // First turn to build history
    const turnEndMsg1 = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "turn 1" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg1);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Session start clears history
    const sessionStartMsg2 = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg2);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Next turn should have no history
    const turnEndMsg2 = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "turn 2" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg2);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(2);
    expect(promptCalls[0]![0]).not.toContain("Session history");
    expect(promptCalls[1]![0]).not.toContain("Session history");
  });

  it("accumulates recent inputs and includes them in analysis prompt", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear state from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // Send two input events
    const inputMsg1 = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "build a feature" } },
    });
    rl.emit("line", inputMsg1);

    const inputMsg2 = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "use TypeScript" } },
    });
    rl.emit("line", inputMsg2);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Turn end should include recent inputs
    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "done" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(1);
    expect(promptCalls[0]![0]).toContain("Recent user inputs (2)");
    expect(promptCalls[0]![0]).toContain("build a feature");
    expect(promptCalls[0]![0]).toContain("use TypeScript");
  });

  it("clears recent inputs on session_start", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear state from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // Send an input
    const inputMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "some command" } },
    });
    rl.emit("line", inputMsg);

    // Session start clears inputs
    const sessionStartMsg2 = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg2);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Turn end should have no recent inputs
    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "ok" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(1);
    expect(promptCalls[0]![0]).not.toContain("Recent user inputs");
  });

  it("limits recent inputs to 5", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear state from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // Send 6 inputs
    for (let i = 1; i <= 6; i++) {
      const inputMsg = JSON.stringify({
        timestamp: Date.now(),
        data: { type: "input", event: { text: `input ${i}` } },
      });
      rl.emit("line", inputMsg);
    }
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    // Turn end should only have 5 most recent inputs
    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "done" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(1);
    expect(promptCalls[0]![0]).toContain("Recent user inputs (5)");
    expect(promptCalls[0]![0]).not.toContain("input 1");
    expect(promptCalls[0]![0]).toContain("input 2");
    expect(promptCalls[0]![0]).toContain("input 6");
  });

  it("ignores empty or whitespace-only input events", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Clear state from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const callsBefore = vi.mocked(session.prompt).mock.calls.length;

    // Send empty and whitespace inputs
    const emptyInput = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "" } },
    });
    rl.emit("line", emptyInput);

    const wsInput = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "   " } },
    });
    rl.emit("line", wsInput);

    // Send one valid input
    const validInput = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "input", event: { text: "valid" } },
    });
    rl.emit("line", validInput);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "ok" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const promptCalls = vi.mocked(session.prompt).mock.calls.slice(callsBefore);
    expect(promptCalls.length).toBe(1);
    expect(promptCalls[0]![0]).toContain("Recent user inputs (1)");
    expect(promptCalls[0]![0]).toContain("valid");
    expect(promptCalls[0]![0]).not.toContain("input 0"); // no empty text
  });

  it("sends error feedback when analysis fails", async () => {
    await waitForVerifierInit();
    const rl = mockInterfaces[0]!;
    const socket = mockSockets[0]!;

    const { createAgentSession } = await import("@earendil-works/pi-coding-agent");
    const mockedFn = vi.mocked(createAgentSession);
    const { session } = await mockedFn.mock.results[0]!.value;

    // Override prompt to simulate failure
    vi.mocked(session.prompt).mockImplementationOnce(async () => {
      await Promise.resolve();
      const sub = (session as typeof session & { subscriberRef?: (event: unknown) => void })
        .subscriberRef;
      sub?.({ type: "auto_retry_end", success: false, finalError: "model timeout" });
    });

    // Clear state from prior tests
    const sessionStartMsg = JSON.stringify({
      timestamp: Date.now(),
      data: { type: "session_start" },
    });
    rl.emit("line", sessionStartMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    const turnEndMsg = JSON.stringify({
      timestamp: Date.now(),
      data: {
        type: "turn_end",
        event: { message: { role: "assistant", content: "test" }, toolResults: [] },
      },
    });
    rl.emit("line", turnEndMsg);
    await new Promise<void>((r) => setTimeout(() => r(), 10));

    expect(socket.write).toHaveBeenCalled();
    const calls = vi.mocked(socket.write).mock.calls;
    const lastCall = fromAny<[string], unknown>(calls[calls.length - 1]);
    const written = JSON.parse(lastCall[0]) as { data: { type: string; content: string } };
    expect(written.data.type).toBe("feedback");
    expect(written.data.content).toContain("Verifier error");
    expect(written.data.content).toContain("model timeout");
  });
});
