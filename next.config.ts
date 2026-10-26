import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Native/binary dependencies used by document processing must stay outside
  // the bundle: @napi-rs/canvas ships a .node addon that ESM chunks can't place.
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "tesseract.js"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
