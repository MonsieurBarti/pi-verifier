# @the-forge-flow/pi-verifier

[![CI](https://github.com/MonsieurBarti/pi-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/MonsieurBarti/pi-verifier/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@the-forge-flow/pi-verifier)](https://www.npmjs.com/package/@the-forge-flow/pi-verifier)

> **PI extension that replicates the two-agent observer system from `disler/the-verifier-agent`: a Builder agent runs normally, while a Verifier subagent observes its session and injects corrective feedback after each turn.**

## Architecture

```
┌─────────────┐      TCP loopback       ┌─────────────┐
│   Builder   │ ◄───── JSONL over ─────► │  Verifier   │
│   (pi)      │      127.0.0.1:9876     │  (subagent) │
└─────────────┘                         └─────────────┘
      │                                        │
      ▼                                        ▼
  Session events                          Read-only
  (turn_end, input)                      analysis
      │                                        │
      ▼                                        ▼
  Feedback injection ◄─────────────── Correction notes
  (followUp message)
```

### Components

| Module                    | Responsibility                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `index.ts`                | Extension entry point — wires all modules, registers commands/tools, manages lifecycle   |
| `toggle-command.ts`       | `/verify on\|off\|resume` command with state machine                                     |
| `socket-server.ts`        | TCP loopback server — broadcasts session events, buffers until verifier connects         |
| `session-capture.ts`      | Builder-side hooks (`session_start`, `turn_end`, `input`) — captures and forwards events |
| `verifier-spawn.ts`       | Spawns verifier subagent process, monitors lifecycle                                     |
| `verifier.ts`             | Verifier daemon — TCP client, read-only `AgentSession`, analysis loop                    |
| `feedback-loop.ts`        | Receives verifier feedback, injects as follow-up message with cooldown/loop detection    |
| `escalation.ts`           | Loop counter — pauses after 3 consecutive feedback injections, supports `/verify resume` |
| `read-only-policy.ts`     | Builder-side tool interceptor — blocks `write`/`edit`/`bash` when verification is active |
| `verifier-prompt-tool.ts` | `verifier_prompt` custom tool for on-demand verification                                 |
| `status-ui.ts`            | Footer status, ASCII widget, spinner indicator                                           |
| `prompt-loader.ts`        | Markdown prompt loader with `{{variable}}` substitution                                  |
| `types.ts`                | Shared TypeScript types and SDK re-exports                                               |

### IPC Protocol

Builder and verifier communicate over **TCP loopback** (127.0.0.1) using **JSON Lines**:

```json
{"timestamp": 1715523456789, "data": {"type": "turn_end", "event": {...}}}
{"timestamp": 1715523456790, "data": {"type": "feedback", "content": "Looks good to me"}}
```

**Message types:**

| Type            | Direction          | Description               |
| --------------- | ------------------ | ------------------------- |
| `session_start` | Builder → Verifier | Session initialized       |
| `turn_end`      | Builder → Verifier | Builder completed a turn  |
| `input`         | Builder → Verifier | User input received       |
| `feedback`      | Verifier → Builder | Analysis result to inject |

**Default port:** `9876` (configurable via extension settings).

## Installation

```bash
pi install npm:@the-forge-flow/pi-verifier
```

## Usage

```bash
/verify on      # Enable verifier mode
/verify off     # Disable verifier mode
/verify resume  # Resume after escalation pause
```

When active, the verifier subagent observes every builder turn and injects feedback as a follow-up message if it detects issues.

## Configuration

| Setting                   | Default   | Description                                   |
| ------------------------- | --------- | --------------------------------------------- |
| Port                      | `9876`    | TCP loopback port for builder↔verifier IPC    |
| Feedback cooldown         | `5000ms`  | Minimum ms between feedback injections        |
| Max verification attempts | `3`       | Consecutive feedbacks before escalation pause |
| Buffer TTL                | `30000ms` | How long to retain buffered messages          |

## Development

```bash
pnpm install
pnpm test              # Run unit tests
pnpm test -- --coverage # Run with coverage report
pnpm run lint
pnpm run typecheck
pnpm run format:check
pnpm run build
```

## License

MIT
