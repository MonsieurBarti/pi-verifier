import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { vi } from "vitest";
import type {
  ExtensionAPI,
  ExtensionContext,
  ExtensionCommandContext,
  VerifierState,
} from "../../src/types.js";

export const makeMockState = (overrides?: Partial<VerifierState>): VerifierState => ({
  mode: "off",
  port: 9876,
  portRetries: 5,
  maxRestarts: 3,
  restartDelayMs: 1000,
  restartCount: 0,
  dangerousTools: new Set(["write", "edit", "bash"]),
  allowedTools: new Set(["read", "grep", "find", "ls"]),
  toolPolicyMode: "block",
  sessionHistory: [],
  server: undefined,
  clients: [],
  buffer: [],
  bufferTtlMs: 30000,
  verifierProcess: undefined,
  pendingVerification: false,
  lastFeedbackInjectedAt: 0,
  feedbackCooldownMs: 5000,
  verificationAttempts: 0,
  maxVerificationAttempts: 3,
  escalationPaused: false,
  lastContext: undefined,
  ...overrides,
});

export const makeMockPi = (): ExtensionAPI =>
  fromPartial<ExtensionAPI>({
    exec: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
    sendUserMessage: vi.fn(),
  });

export const makeMockCtx = (): ExtensionContext =>
  fromAny<ExtensionContext, unknown>({
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
      setWidget: vi.fn(),
      setWorkingIndicator: vi.fn(),
      setWorkingMessage: vi.fn(),
    },
    sessionManager: {
      getSessionId: vi.fn(() => "mock-session"),
    },
    cwd: "/tmp",
  });

export const makeMockCommandCtx = (): ExtensionCommandContext =>
  fromAny<ExtensionCommandContext, unknown>({
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
    },
    cwd: "/tmp",
  });

export const makeMockEscalation = () => ({
  inputHandler: vi.fn(),
  checkEscalation: vi.fn(() => false),
  incrementAttempts: vi.fn(),
  resume: vi.fn(),
});
