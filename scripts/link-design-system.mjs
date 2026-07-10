import { existsSync, mkdirSync, symlinkSync, unlinkSync, lstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "../mrs-design_system/dist");
const link = join(root, "packages/design-system/dist");

if (!existsSync(target)) {
  console.warn(
    `[postinstall] Design system not found at ${target} — skipping symlink`,
  );
  process.exit(0);
}

mkdirSync(dirname(link), { recursive: true });
try {
  if (existsSync(link)) {
    const stat = lstatSync(link);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      unlinkSync(link);
    }
  }
  symlinkSync(target, link, "dir");
  console.log("[postinstall] Linked design-system dist");
} catch (err) {
  console.warn("[postinstall] Could not symlink design-system:", err);
}
