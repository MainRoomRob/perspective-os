import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../prompts/v1",
);

const PROMPT_FILES = [
  "step-1-multi-perspective.md",
  "step-2-contradiction-map.md",
  "step-3-synthesis.md",
  "step-4-peer-review.md",
  "build-missing-perspective.md",
  "briefing-delta.md",
  "recommend-roster.md",
] as const;

const PROMPTS: Record<string, string> = Object.fromEntries(
  PROMPT_FILES.map((name) => [
    name,
    readFileSync(join(PROMPT_DIR, name), "utf-8"),
  ]),
);

export function loadPrompt(name: string): string {
  const text = PROMPTS[name];
  if (!text) throw new Error(`Unknown prompt: ${name}`);
  return text;
}

export function fillPrompt(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
