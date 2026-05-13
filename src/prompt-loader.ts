import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const promptCache = new Map<string, string>();
const personaCache = new Map<string, string>();

function resolveAssetPath(...segments: string[]): string {
  const candidates = [
    join(import.meta.dirname, ...segments),
    join(import.meta.dirname, "..", "src", ...segments),
    join(import.meta.dirname, "..", "dist", ...segments),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // None found — return the first candidate and let readFileSync throw with a clear path
  return candidates[0]!;
}

export function loadPrompt(name: string, variables?: Record<string, string>): string {
  const path = resolveAssetPath("prompts", `${name}.md`);
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
  const path = resolveAssetPath("persona", "verifier.md");

  const cached = personaCache.get(path);
  if (cached) return cached;

  const text = readFileSync(path, "utf8");
  personaCache.set(path, text);
  return text;
}
