import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
loadEnvConfig(monorepoRoot);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@perspective-os/core",
    "@perspective-os/db",
    "@perspective-os/ai",
    "@perspective-os/web-server",
    "@mainroomstudio/design-system",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
