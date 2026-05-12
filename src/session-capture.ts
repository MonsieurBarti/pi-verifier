import type {
  ExtensionContext,
  SessionStartEvent,
  TurnEndEvent,
  InputEvent,
  VerifierState,
} from "./types.js";
import { broadcast } from "./socket-server.js";

export interface SessionCaptureDeps {
  state: VerifierState;
  onTurnEnd?: (event: TurnEndEvent) => void;
}

export interface SessionCaptureHooks {
  sessionStartHandler(event: SessionStartEvent, ctx: ExtensionContext): void;
  turnEndHandler(event: TurnEndEvent, ctx: ExtensionContext): void;
  inputHandler(event: InputEvent, ctx: ExtensionContext): void;
}

export function createSessionCaptureHooks(deps: SessionCaptureDeps): SessionCaptureHooks {
  const { state } = deps;

  const sessionStartHandler = (_event: SessionStartEvent, ctx: ExtensionContext): void => {
    state.lastContext = ctx;
    if (state.mode === "off") return;
    broadcast(deps, { type: "session_start" });
  };

  const turnEndHandler = (event: TurnEndEvent, ctx: ExtensionContext): void => {
    state.lastContext = ctx;
    if (state.mode === "off") return;
    broadcast(deps, { type: "turn_end", event });
    deps.onTurnEnd?.(event);
  };

  const inputHandler = (event: InputEvent, ctx: ExtensionContext): void => {
    state.lastContext = ctx;
    if (state.mode === "off") return;
    broadcast(deps, { type: "input", event });
  };

  return {
    sessionStartHandler,
    turnEndHandler,
    inputHandler,
  };
}
