import { describe, expect, it } from "vitest";
import { loadPrompt, loadPersona } from "../src/prompt-loader.js";

describe("prompt-loader", () => {
  it("should read a prompt file and substitute variables", () => {
    const result = loadPrompt("builder_error", { error: "ENOENT: no such file or directory" });
    expect(result).toContain("ENOENT: no such file or directory");
    expect(result).not.toContain("{{error}}");
  });

  it("should read the verifier persona", () => {
    const result = loadPersona();
    expect(result).toContain("Verifier Persona");
    expect(result).toContain("LGTM");
  });

  it("should leave missing variable placeholders as-is", () => {
    const result = loadPrompt("builder_error");
    expect(result).toContain("{{error}}");
  });

  it("should read verify_on_stop prompt without variables", () => {
    const result = loadPrompt("verify_on_stop");
    expect(result).toContain("No feedback was produced");
  });
});
