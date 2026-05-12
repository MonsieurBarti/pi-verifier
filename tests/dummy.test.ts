import { describe, expect, it, vi } from "vitest";
import verifierExtension, { type PiExtensionApi } from "../src/index.js";

describe("verifierExtension", () => {
  it("should load without error", () => {
    const mockPi: PiExtensionApi = {
      cwd: "/tmp",
      exec: vi.fn(),
      on: vi.fn(),
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    expect(() => verifierExtension(mockPi)).not.toThrow();
  });

  it("should register the /verify command", () => {
    const mockPi: PiExtensionApi = {
      cwd: "/tmp",
      exec: vi.fn(),
      on: vi.fn(),
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    verifierExtension(mockPi);

    expect(mockPi.registerCommand).toHaveBeenCalledWith(
      "verify",
      expect.objectContaining({
        description: expect.stringContaining("Toggle"),
      }),
    );
  });

  it("should register session hooks", () => {
    const mockPi: PiExtensionApi = {
      cwd: "/tmp",
      exec: vi.fn(),
      on: vi.fn(),
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    verifierExtension(mockPi);

    expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("turn_end", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("input", expect.any(Function));
  });
});
