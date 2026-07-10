/**
 * Apply pending SQL migrations to DATABASE_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("Set DATABASE_URL in .env");
  process.exit(1);
}

if (
  /ep-xxxx|USER:PASSWORD|changeme|your[-_]?password/i.test(url) ||
  url.includes("@ep-xxxx.")
) {
  console.error(`
DATABASE_URL is still the .env.example placeholder.

Replace it with a real Postgres connection string:

  Neon (recommended):
    1. https://console.neon.tech → create project
    2. Connection details → copy the *pooled* connection string
    3. Paste into .env as DATABASE_URL=...

  Local Postgres:
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/perspective_os
`);
  process.exit(1);
}

const useSsl =
  url.includes("neon.tech") ||
  url.includes("sslmode=require") ||
  url.includes("sslmode=verify-full");

const sql = postgres(url, { max: 1, ssl: useSsl ? "require" : undefined });
const drizzleDir = join(__dirname, "../packages/db/drizzle");
const migrationFiles = readdirSync(drizzleDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function ensureMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function appliedFilenames() {
  const rows = await sql`SELECT filename FROM schema_migrations ORDER BY filename`;
  return new Set(rows.map((r) => r.filename));
}

try {
  await ensureMigrationTable();
  const alreadyApplied = await appliedFilenames();

  let appliedNow = 0;
  for (const file of migrationFiles) {
    if (alreadyApplied.has(file)) {
      console.log("Skip (already applied):", file);
      continue;
    }
    const migrationSql = readFileSync(join(drizzleDir, file), "utf-8");
    await sql.unsafe(migrationSql);
    await sql`
      INSERT INTO schema_migrations (filename)
      VALUES (${file})
      ON CONFLICT (filename) DO NOTHING
    `;
    console.log("Applied:", file);
    appliedNow++;
  }

  if (appliedNow === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`Applied ${appliedNow} migration(s) successfully.`);
  }
} catch (e) {
  console.error("Migration failed:", e);
  process.exit(1);
} finally {
  await sql.end();
}
