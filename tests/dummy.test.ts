import { describe, expect, it, vi } from "vitest";
import verifierExtension, { type ExtensionAPI } from "../src/index.js";

const makeMockPi = (): ExtensionAPI =>
  ({
    cwd: "/tmp",
    exec: vi.fn(),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
  }) as unknown as ExtensionAPI;

describe("verifierExtension", () => {
  it("should load without error", () => {
    expect(() => verifierExtension(makeMockPi())).not.toThrow();
  });

  it("should register the /verify command", () => {
    const mockPi = makeMockPi();
    verifierExtension(mockPi);

    expect(mockPi.registerCommand).toHaveBeenCalledWith(
      "verify",
      expect.objectContaining({
        description: expect.stringContaining("Toggle"),
      }),
    );
  });

  it("should register session hooks", () => {
    const mockPi = makeMockPi();
    verifierExtension(mockPi);

    expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("turn_end", expect.any(Function));
    expect(mockPi.on).toHaveBeenCalledWith("input", expect.any(Function));
  });
});
