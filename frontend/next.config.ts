import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a minimal `.next/standalone` server bundle (only the files needed to run `node server.js`)
  // so the Docker image doesn't need to ship node_modules/the full source tree.
  output: "standalone",
};

export default nextConfig;
