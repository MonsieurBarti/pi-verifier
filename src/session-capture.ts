import type { PiEventHandler, VerifierState } from "./types.js";
import { broadcast } from "./socket-server.js";

export interface SessionCaptureDeps {
  state: VerifierState;
}

export function createSessionCaptureHooks(deps: SessionCaptureDeps) {
  const { state } = deps;

  const sessionStartHandler: PiEventHandler = (_event, _ctx) => {
    if (state.mode === "off") return;
    broadcast(deps, { type: "session_start" });
  };

  const turnEndHandler: PiEventHandler = (event, _ctx) => {
    if (state.mode === "off") return;
    broadcast(deps, { type: "turn_end", event });
  };

  const inputHandler: PiEventHandler = (event, _ctx) => {
    if (state.mode === "off") return;
    broadcast(deps, { type: "input", event });
  };

  return {
    sessionStartHandler,
    turnEndHandler,
    inputHandler,
  };
}
