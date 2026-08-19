import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Static export.
   * If this project ever gains a dynamic route, remove this and switch to
   * `@opennextjs/cloudflare`.
   */
  output: "export",
};

export default nextConfig;
