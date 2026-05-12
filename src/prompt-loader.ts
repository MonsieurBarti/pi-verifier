import { readFileSync } from "node:fs";
import { join } from "node:path";

const promptCache = new Map<string, string>();
const personaCache = new Map<string, string>();

export function loadPrompt(name: string, variables?: Record<string, string>): string {
  const path = join(import.meta.dirname, "prompts", `${name}.md`);
  const cacheKey = variables ? `${path}:${JSON.stringify(variables)}` : path;

  const cached = promptCache.get(cacheKey);
  if (cached) return cached;

  let text = readFileSync(path, "utf8");

  if (variables && Object.keys(variables).length > 0) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replaceAll(`{{${key}}}`, value);
    }
  }

  promptCache.set(cacheKey, text);
  return text;
}

export function loadPersona(): string {
  const path = join(import.meta.dirname, "persona", "verifier.md");

  const cached = personaCache.get(path);
  if (cached) return cached;

  const text = readFileSync(path, "utf8");
  personaCache.set(path, text);
  return text;
}
