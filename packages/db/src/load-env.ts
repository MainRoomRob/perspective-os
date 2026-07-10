import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let loaded = false;

export function loadEnvIfNeeded(): void {
  if (loaded || process.env.DATABASE_URL) {
    loaded = true;
    return;
  }

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../../../.env"),
  ];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    parseEnvFile(readFileSync(envPath, "utf-8"));
    if (process.env.DATABASE_URL) {
      loaded = true;
      return;
    }
  }
}

function parseEnvFile(contents: string): void {
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
