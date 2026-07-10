import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnvIfNeeded } from "./load-env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | null = null;
let db: Db | null = null;

function isPooledUrl(url: string) {
  return url.includes("-pooler.") || url.includes(".pooler.");
}

function createPostgresClient(url: string) {
  const useSsl =
    url.includes("neon.tech") ||
    url.includes("sslmode=require") ||
    url.includes("sslmode=verify-full");
  const pooled = isPooledUrl(url);

  return postgres(url, {
    max: pooled ? 1 : 10,
    ssl: useSsl ? "require" : undefined,
    prepare: !pooled,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });
}

export function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const code = e.code ?? "";
  const message = (e.message ?? "").toLowerCase();
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    message.includes("econnreset") ||
    message.includes("connection terminated") ||
    message.includes("socket hang up") ||
    message.includes("connection closed")
  );
}

export function getDb() {
  loadEnvIfNeeded();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!db) {
    client = createPostgresClient(url);
    db = drizzle(client, { schema });
  }
  return db;
}

export async function withDbRetry<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  try {
    return await fn(getDb());
  } catch (err) {
    if (!isDbConnectionError(err)) throw err;
    await closeDb();
    return await fn(getDb());
  }
}

export async function closeDb() {
  if (client) {
    await client.end({ timeout: 0 });
    client = null;
    db = null;
  }
}
