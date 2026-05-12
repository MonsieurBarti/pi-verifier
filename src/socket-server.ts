import { createServer } from "node:net";
import type { FeedbackPayload, VerifierState } from "./types.js";

export interface SocketServerDeps {
  state: VerifierState;
  onFeedback?: (payload: FeedbackPayload) => void;
}

export function startSocketServer(deps: SocketServerDeps): Promise<void> {
  const { state } = deps;
  if (state.server) return Promise.resolve(); // Already running

  return new Promise((resolve) => {
    const server = createServer((socket) => {
      state.clients.push(socket);
      state.mode = "active";
      let inboundBuffer = "";

      // Flush any buffered messages to the new client
      for (const msg of state.buffer) {
        socket.write(JSON.stringify(msg) + "\n");
      }
      state.buffer = []; // Clear buffer after flush

      socket.on("data", (chunk) => {
        inboundBuffer += chunk.toString();
        const lines = inboundBuffer.split("\n");
        inboundBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line) as { data?: unknown };
              const payload = parsed.data as FeedbackPayload | undefined;
              if (payload && payload.type === "feedback") {
                deps.onFeedback?.(payload);
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      });

      socket.on("close", () => {
        const idx = state.clients.indexOf(socket);
        if (idx >= 0) state.clients.splice(idx, 1);
        if (state.clients.length === 0) {
          state.mode = "waiting";
        }
      });
    });

    server.listen(state.port, () => {
      state.server = server;
      resolve();
    });
  });
}

export function stopSocketServer(deps: SocketServerDeps): void {
  const { state } = deps;

  for (const client of state.clients) {
    client.destroy();
  }
  state.clients = [];

  if (state.server) {
    state.server.close();
    state.server = undefined;
  }
}

export function broadcast(deps: SocketServerDeps, data: unknown): void {
  const { state } = deps;
  const msg = { timestamp: Date.now(), data };

  if (state.clients.length > 0) {
    const line = JSON.stringify(msg) + "\n";
    for (const client of state.clients) {
      client.write(line);
    }
  } else {
    // Buffer if no clients connected; drop old messages past TTL
    state.buffer.push(msg);
    const cutoff = Date.now() - state.bufferTtlMs;
    state.buffer = state.buffer.filter((m) => {
      const ts = (m as { timestamp?: number }).timestamp ?? 0;
      return ts > cutoff;
    });
  }
}
