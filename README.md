<div align="center">
  <img src="https://raw.githubusercontent.com/MonsieurBarti/The-Forge-Flow-CC/refs/heads/main/assets/forge-banner.png" alt="The Forge Flow" width="100%">

  <h1>🔍 @the-forge-flow/pi-verifier</h1>

  <p>
    <strong>PI extension that runs a verifier subagent to observe and correct builder sessions</strong>
  </p>

  <p>
    <a href="https://github.com/MonsieurBarti/pi-verifier/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/MonsieurBarti/pi-verifier/ci.yml?label=CI&style=flat-square" alt="CI Status">
    </a>
    <a href="https://www.npmjs.com/package/@the-forge-flow/pi-verifier">
      <img src="https://img.shields.io/npm/v/@the-forge-flow/pi-verifier?style=flat-square" alt="npm version">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/MonsieurBarti/pi-verifier?style=flat-square" alt="License">
    </a>
  </p>
</div>

---

## ✨ Features

- **🔍 Two-agent observer system** — Builder agent runs normally while a Verifier subagent observes and injects corrective feedback after each turn
- **🛡️ Read-only policy** — Automatically blocks `write`, `edit`, and `bash` tool calls when verification is active
- **🔄 Feedback loop with cooldown** — Prevents feedback storms with configurable cooldown and escalation pause after 3 consecutive corrections
- **📡 TCP loopback IPC** — Bidirectional JSONL communication between builder and verifier over 127.0.0.1
- **📊 Live status UI** — Footer status, ASCII widget, and spinner indicator showing verifier state
- **⚡ On-demand verification** — `verifier_prompt` tool for requesting immediate attention from the verifier

## 📦 Installation

**From npm:**

```bash
pi install npm:@the-forge-flow/pi-verifier
```

**From GitHub (tracks `main`):**

```bash
pi install git:github.com/MonsieurBarti/pi-verifier
```

Then reload PI with `/reload`.

## 🚀 Usage

```bash
/verify on      # Enable verifier mode
/verify off     # Disable verifier mode
/verify resume  # Resume after escalation pause
```

When active, the verifier subagent observes every builder turn and injects feedback as a follow-up message if it detects issues. Say "LGTM" when the code is correct.

### On-demand verification

The builder can also request immediate verification via the `verifier_prompt` tool:

```
Use the verifier_prompt tool to double-check my recent refactor (reason: "check my refactor")
```

## 🏗️ Architecture

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

| Module | Responsibility |
|--------|---------------|
| `index.ts` | Extension entry point — wires all modules, registers commands/tools, manages lifecycle |
| `toggle-command.ts` | `/verify on\|off\|resume` command with state machine |
| `socket-server.ts` | TCP loopback server — broadcasts session events, buffers until verifier connects |
| `session-capture.ts` | Builder-side hooks (`session_start`, `turn_end`, `input`) — captures and forwards events |
| `verifier-spawn.ts` | Spawns verifier subagent process, monitors lifecycle |
| `verifier.ts` | Verifier daemon — TCP client, read-only `AgentSession`, analysis loop |
| `feedback-loop.ts` | Receives verifier feedback, injects as follow-up message with cooldown/loop detection |
| `escalation.ts` | Loop counter — pauses after 3 consecutive feedback injections, supports `/verify resume` |
| `read-only-policy.ts` | Builder-side tool interceptor — blocks `write`/`edit`/`bash` when verification is active |
| `verifier-prompt-tool.ts` | `verifier_prompt` custom tool for on-demand verification |
| `status-ui.ts` | Footer status, ASCII widget, spinner indicator |
| `prompt-loader.ts` | Markdown prompt loader with `{{variable}}` substitution |
| `types.ts` | Shared TypeScript types, SDK re-exports, and runtime type guards |

### IPC Protocol

Builder and verifier communicate over **TCP loopback** (127.0.0.1) using **JSON Lines**:

```json
{"timestamp": 1715523456789, "data": {"type": "turn_end", "event": {...}}}
{"timestamp": 1715523456790, "data": {"type": "feedback", "content": "Looks good to me"}}
```

| Type | Direction | Description |
|------|-----------|-------------|
| `session_start` | Builder → Verifier | Session initialized |
| `turn_end` | Builder → Verifier | Builder completed a turn |
| `input` | Builder → Verifier | User input received |
| `feedback` | Verifier → Builder | Analysis result to inject |

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Port | `9876` | TCP loopback port for builder↔verifier IPC |
| Feedback cooldown | `5000ms` | Minimum ms between feedback injections |
| Max verification attempts | `3` | Consecutive feedbacks before escalation pause |
| Buffer TTL | `30000ms` | How long to retain buffered messages |

## 🧪 Development

```bash
pnpm install
pnpm test              # Run unit tests
pnpm test:coverage     # Run with coverage report
pnpm run lint
pnpm run typecheck
pnpm run format:check
pnpm run build
```

## 🪶 Status

<!-- x-release-please-start-version -->
v0.0.1
<!-- x-release-please-end -->

PI extension shipped with 13 modules, 16 test files (81 tests), and full test coverage above thresholds. The verifier subagent runs as an isolated Node.js process with read-only tool access, analyzing every builder turn via the PI coding agent SDK.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit with conventional commits (`git commit -m "feat: add something"`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📜 License

MIT © [MonsieurBarti](https://github.com/MonsieurBarti)

---

<div align="center">
  <sub>Built with ⚡ by <a href="https://github.com/MonsieurBarti">MonsieurBarti</a></sub>
</div>
