import type {
  ExtensionContext,
  SessionStartEvent,
  TurnEndEvent,
  InputEvent,
  BeforeAgentStartEvent,
  VerifierState,
} from "./types.js";
import { broadcast } from "./socket-server.js";
import * as path from "node:path";
import * as os from "node:os";

export interface SessionCaptureDeps {
  state: VerifierState;
  onTurnEnd?: (event: TurnEndEvent) => void;
}

export interface SessionCaptureHooks {
  sessionStartHandler(event: SessionStartEvent, ctx: ExtensionContext): void;
  beforeAgentStartHandler(
    event: BeforeAgentStartEvent,
    ctx: ExtensionContext,
  ): void | Promise<void>;
  turnEndHandler(event: TurnEndEvent, ctx: ExtensionContext): void;
  inputHandler(event: InputEvent, ctx: ExtensionContext): void;
}

export function createSessionCaptureHooks(deps: SessionCaptureDeps): SessionCaptureHooks {
  const { state } = deps;

  const sessionStartHandler = (_event: SessionStartEvent, ctx: ExtensionContext): void => {
    state.lastContext = ctx;
    if (state.mode === "off") return;

    const sessionId = ctx.sessionManager?.getSessionId() ?? "unknown";
    state.sessionFilePath =
      ctx.sessionManager?.getSessionFile() ??
      path.join(os.homedir(), ".pi", "agent", "sessions", `${sessionId}.jsonl`);

    state.turnIndex = 0;
    state.injectedNext = false;
    state.lastUserPrompt = undefined;
    state.currentTurnGenuine = false;

    broadcast(deps, { type: "session_start" });
  };

  const inputHandler = (event: InputEvent, _ctx: ExtensionContext): void => {
    // Track whether the upcoming turn was triggered by our own feedback injection.
    // The ExtensionAPI does not propagate source onto BeforeAgentStartEvent directly,
    // so we capture it here.
    state.injectedNext = event.source === "extension";
    if (event.source !== "extension" && typeof event.text === "string") {
      state.lastUserPrompt = event.text;
    }
  };

  const beforeAgentStartHandler = (_event: BeforeAgentStartEvent, _ctx: ExtensionContext): void => {
    if (state.mode === "off") return;

    if (state.injectedNext) {
      // Verifier-corrective turn — don't reset verificationAttempts, don't fire
      // a start event. Clear the flag so the NEXT turn (if it's a real user prompt)
      // is treated normally.
      state.injectedNext = false;
      state.currentTurnGenuine = false;
      return;
    }

    // Genuine user prompt: fresh verification cycle begins here.
    state.verificationAttempts = 0;
    state.turnIndex += 1;
    state.currentTurnGenuine = true;

    broadcast(deps, {
      type: "start",
      turnIndex: state.turnIndex,
      userPrompt: state.lastUserPrompt,
    });
  };

  const turnEndHandler = (event: TurnEndEvent, ctx: ExtensionContext): void => {
    state.lastContext = ctx;
    if (state.mode === "off") return;

    // Always broadcast stop events so the verifier can correlate them with start
    // events via turnIndex. The verifier skips stop events that have no matching
    // start (i.e. injected corrective turns).
    broadcast(deps, {
      type: "stop",
      turnIndex: state.turnIndex,
      event,
      userPrompt: state.lastUserPrompt,
    });

    deps.onTurnEnd?.(event);
  };

  return {
    sessionStartHandler,
    beforeAgentStartHandler,
    turnEndHandler,
    inputHandler,
  };
}
