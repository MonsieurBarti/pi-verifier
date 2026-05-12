# Checkpoint: M4 — Verifier Subagent & Core Feedback Loop

**Completed:** 2026-05-12 21:05
**Duration:** ~25 minutes
**Attempts:** 1

## Plan File
`docs/engineering-discipline/plans/2026-05-12-verifier-loop.md`

## Review File
`docs/engineering-discipline/reviews/2026-05-12-verifier-loop-review.md`

## Test Results
```
✓ pnpm test — 41 tests passed (8 test files)
✓ pnpm run typecheck — 0 errors
✓ pnpm run lint — 0 warnings, 0 errors
✓ pnpm run format:check — all files correct
```

## Files Changed
- `src/types.ts` — extended `VerifierState` with verification fields; added `IpcMessage`, `IpcPayload`, `FeedbackPayload`
- `src/socket-server.ts` — bidirectional JSONL parsing; incoming feedback handler
- `src/verifier.ts` — verifier daemon: TCP client, read-only `AgentSession`, `turn_end` analysis, feedback response
- `src/verifier-spawn.ts` — builder-side process spawner with lifecycle monitoring
- `src/feedback-loop.ts` — loop detection + feedback injection via `sendUserMessage(..., { deliverAs: "followUp" })`
- `src/session-capture.ts` — optional `onTurnEnd` callback
- `src/prompt-loader.ts` — markdown prompt loader with `{{variable}}` substitution
- `src/persona/verifier.md` — verifier system prompt
- `src/prompts/verify_on_stop.md` — stop template
- `src/prompts/builder_error.md` — error template
- `src/index.ts` — wired all modules; lifecycle hooks for server + verifier
- `tests/*.test.ts` — 41 tests across all modules
- `oxlint.json` — added `init-declarations: off` for top-level module variables

## State After Milestone
The extension now spawns a verifier subagent when `/verify on` is activated. The verifier receives builder session events over TCP loopback, analyzes each `turn_end` with a read-only `AgentSession`, and sends feedback back to the builder, which injects it as a follow-up message. Loop detection (cooldown + pending flag) prevents infinite recursion. Ready for M5 (Safety, Prompts & Advanced UI).

## Interfaces Established
- **Bidirectional TCP protocol:** JSONL `{ timestamp, data }` where `data` can be `turn_end`, `session_start`, `input`, or `feedback`
- **VerifierState:** now includes `verifierProcess`, `pendingVerification`, `lastFeedbackInjectedAt`, `feedbackCooldownMs`
- **Feedback injection:** `pi.sendUserMessage(content, { deliverAs: "followUp" })`
- **Read-only tool allowlist:** `["read", "grep", "find", "ls"]` enforced via `createAgentSession({ noTools: "all", tools: [...] })`
