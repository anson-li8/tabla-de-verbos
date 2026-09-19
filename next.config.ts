import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // fully static export — `next build` emits the deployable site
  // into ./out (no server, no API routes, no database: everything
  // runs client-side with localStorage persistence)
  output: "export",
  images: {
    // no image optimizer in a static export — all icons are
    // unoptimized <svg>/<img> anyway
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
