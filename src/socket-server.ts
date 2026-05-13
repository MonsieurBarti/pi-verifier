import { createServer } from "node:net";
import {
  isFeedbackPayload,
  isIpcMessage,
  toJsonl,
  type FeedbackPayload,
  type VerifierState,
} from "./types.js";

export interface SocketServerDeps {
  state: VerifierState;
  onFeedback?: (payload: FeedbackPayload) => void;
}

export function startSocketServer(deps: SocketServerDeps, preferredPort?: number): Promise<void> {
  const { state } = deps;
  if (state.server) return Promise.resolve(); // Already running

  const port = preferredPort ?? state.port;

  return new Promise((resolve, reject) => {
    const server = createServer((socket) => {
      state.clients.push(socket);
      state.mode = "active";
      let inboundBuffer = "";

      // Flush any buffered messages to the new client
      for (const msg of state.buffer) {
        socket.write(toJsonl(msg));
      }
      state.buffer = []; // Clear buffer after flush

      function handleInboundLine(line: string): void {
        if (!line.trim()) return;
        try {
          const parsed = JSON.parse(line);
          if (isIpcMessage(parsed) && isFeedbackPayload(parsed.data)) {
            deps.onFeedback?.(parsed.data);
          }
        } catch {
          // ignore malformed JSON lines
        }
      }

      socket.on("data", (chunk) => {
        inboundBuffer += chunk.toString();
        const lines = inboundBuffer.split("\n");
        inboundBuffer = lines.pop() ?? "";
        for (const line of lines) {
          handleInboundLine(line);
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

    const onError = (err: Error) => {
      server.off("error", onError);
      reject(err);
    };
    server.once("error", onError);

    server.listen(port, () => {
      server.off("error", onError);
      state.server = server;
      state.port = port;
      resolve();
    });
  });
}

export async function startSocketServerWithFallback(deps: SocketServerDeps): Promise<void> {
  const { state } = deps;
  if (state.server) return;

  let port = state.port;
  let retries = state.portRetries;

  while (retries >= 0) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      await startSocketServer(deps, port);
      return;
    } catch (error) {
      if (retries === 0) {
        throw new Error(
          `Could not bind to any port in range ${state.port}-${port}. Last error: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      port++;
      retries--;
    }
  }
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
    const line = toJsonl(msg);
    for (const client of state.clients) {
      client.write(line);
    }
  } else {
    state.buffer.push(msg);
    const cutoff = Date.now() - state.bufferTtlMs;
    state.buffer = state.buffer.filter((m) => m.timestamp > cutoff);
  }
}
