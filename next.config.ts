import type { NextConfig } from "next";

/**
 * Drop is a fully client-side SPA: no API routes, no database. The browser
 * talks to GitHub/GitLab directly, so the whole app exports to static HTML/JS
 * and can be hosted on GitHub Pages or Netlify.
 *
 * If you host at a project page like https://your-username.github.io/drop/,
 * build with `NEXT_PUBLIC_BASE_PATH=/drop` so asset URLs resolve correctly.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
