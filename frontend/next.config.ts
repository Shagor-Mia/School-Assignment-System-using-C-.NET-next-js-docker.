import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a minimal `.next/standalone` server bundle (only the files needed to run `node server.js`)
  // so the Docker image doesn't need to ship node_modules/the full source tree.
  // Skipped on Vercel (it sets VERCEL=1), which produces its own output and fails with standalone.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
