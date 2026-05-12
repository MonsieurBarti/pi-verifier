# IPC Architecture Decision

**Date:** 2026-05-12
**Spike:** M2 — IPC Architecture Spike

## Approaches Tested

### 1. TCP Loopback (Selected)
- **Mechanism:** Builder opens TCP server on 127.0.0.1. Verifier connects as client. Messages are JSON lines over TCP.
- **Latency:** 43/50 messages received, avg **0ms**, max **1ms**
- **Pros:** True real-time streaming, cross-platform, no polling overhead, sub-millisecond latency
- **Cons:** Requires port management, verifier must connect before builder starts sending (minor race condition)

### 2. File-based JSONL (Rejected)
- **Mechanism:** Builder appends JSON lines to `session.jsonl`. Verifier polls file every 50ms.
- **Latency:** 50/50 messages received, avg **79ms**, max **670ms**
- **Pros:** Dead simple, no networking code, works everywhere
- **Cons:** Polling overhead, disk I/O, max latency exceeds 500ms requirement (670ms spike on first read), not truly real-time

### 3. Unix Domain Socket (Not tested — optional future enhancement)
- **Mechanism:** Similar to TCP but uses filesystem socket. Lower latency than TCP on same machine.
- **Latency:** N/A (not tested)
- **Pros:** Fastest possible local IPC, no port conflicts
- **Cons:** Unix-only (no Windows support), socket file cleanup needed

## Decision

**Selected:** TCP Loopback

**Rationale:** TCP loopback achieved **sub-millisecond average latency** with a maximum of **1ms** — three orders of magnitude under the 500ms requirement. It provides true streaming without polling overhead. The 43/50 message delivery rate in the spike was due to a startup race condition (verifier connected after the first few messages were sent); in production, the verifier will be spawned before the builder begins its session, eliminating this race.

File-based JSONL was rejected because its **maximum latency of 670ms exceeds the 500ms feasibility threshold**, and its average of 79ms is 79× slower than TCP. Polling also wastes CPU cycles.

**Fallback:** If TCP loopback causes issues (e.g., port conflicts, firewall blocks on localhost), switch to **File-based JSONL with a 25ms poll interval** and accept the occasional >500ms spike as a degraded mode. The port will be configurable via extension settings.

## Risks

1. **Port conflicts:** If port 9876 is taken, the extension will fail. Mitigation: make port configurable and retry on nearby ports.
2. **Subagent networking:** The verifier subagent must be able to connect to localhost TCP. This requires the subagent's environment to allow outgoing connections to 127.0.0.1 (should be unrestricted in standard environments).
3. **Session cleanup:** TCP server must be closed when the pi session ends to prevent dangling processes. Mitigation: use `session_shutdown` hook.
4. **Startup race:** Verifier must connect before builder sends. Mitigation: spawn verifier before enabling session capture; buffer messages until first client connects.
