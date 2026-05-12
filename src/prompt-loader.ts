import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadPrompt(name: string, variables?: Record<string, string>): string {
  const path = join(import.meta.dirname, "prompts", `${name}.md`);
  let text = readFileSync(path, "utf8");

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replaceAll(`{{${key}}}`, value);
    }
  }

  return text;
}

export function loadPersona(): string {
  const path = join(import.meta.dirname, "persona", "verifier.md");
  return readFileSync(path, "utf8");
}
