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
  ({
    cwd: "/tmp",
    exec: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
    sendUserMessage: vi.fn(),
  }) as unknown as ExtensionAPI;

export const makeMockCtx = (): ExtensionContext =>
  ({
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
      setWidget: vi.fn(),
      setWorkingIndicator: vi.fn(),
      setWorkingMessage: vi.fn(),
    },
    cwd: "/tmp",
  }) as unknown as ExtensionContext;

export const makeMockCommandCtx = (): ExtensionCommandContext =>
  ({
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
    },
    cwd: "/tmp",
  }) as unknown as ExtensionCommandContext;

export const makeMockEscalation = () => ({
  inputHandler: vi.fn(),
  checkEscalation: vi.fn(() => false),
  incrementAttempts: vi.fn(),
  resume: vi.fn(),
});
