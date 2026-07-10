import { existsSync, mkdirSync, symlinkSync, unlinkSync, lstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "../mrs-design_system/dist");
const link = join(root, "packages/design-system/dist");

if (!existsSync(target)) {
  if (existsSync(link)) {
    try {
      const stat = lstatSync(link);
      if (!stat.isSymbolicLink()) {
        // Vendored dist committed in repo — sufficient for CI/deploy.
        process.exit(0);
      }
    } catch {
      // fall through
    }
  }
  console.warn(
    `[postinstall] Design system not found at ${target} — skipping symlink`,
  );
  process.exit(0);
}

mkdirSync(dirname(link), { recursive: true });
try {
  if (existsSync(link)) {
    const stat = lstatSync(link);
    if (stat.isSymbolicLink()) {
      unlinkSync(link);
    } else if (stat.isDirectory()) {
      // Vendored dist directory — leave in place unless replacing with symlink.
      process.exit(0);
    }
  }
  symlinkSync(target, link, "dir");
  console.log("[postinstall] Linked design-system dist");
} catch (err) {
  console.warn("[postinstall] Could not symlink design-system:", err);
}
