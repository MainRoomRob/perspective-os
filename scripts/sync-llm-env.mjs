import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, ".env");
const sourcePath =
  process.argv[2] ??
  path.join(repoRoot, "../positioning-os/dev_and_code/.env");

const KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "LLM_PROVIDER",
];

function parseEnv(contents) {
  const values = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return values;
}

function isEmpty(value) {
  return !value || !String(value).trim();
}

if (!existsSync(targetPath)) {
  console.error(`Missing ${targetPath}. Copy .env.example first.`);
  process.exit(1);
}

if (!existsSync(sourcePath)) {
  console.error(`Source env not found: ${sourcePath}`);
  process.exit(1);
}

const source = parseEnv(readFileSync(sourcePath, "utf-8"));
let envText = readFileSync(targetPath, "utf-8");
const updated = [];

for (const key of KEYS) {
  const next = source[key];
  if (isEmpty(next)) continue;

  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(envText)) {
    const current = parseEnv(envText)[key];
    if (!isEmpty(current)) continue;
    envText = envText.replace(pattern, `${key}=${next}`);
    updated.push(key);
  } else {
    envText += `\n${key}=${next}`;
    updated.push(key);
  }
}

if (updated.length === 0) {
  console.log("No empty LLM keys to sync.");
  process.exit(0);
}

writeFileSync(targetPath, envText.endsWith("\n") ? envText : `${envText}\n`);
console.log(`Synced ${updated.join(", ")} from ${sourcePath}`);
