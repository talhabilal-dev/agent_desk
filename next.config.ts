import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Native/binary dependencies used by document processing must stay outside
  // the bundle: @napi-rs/canvas ships a .node addon that ESM chunks can't place,
  // and bundling unpdf breaks pdf.js's Node detection so it tries to transfer
  // data to a worker ("Cannot transfer object of unsupported type").
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "tesseract.js", "unpdf"],
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
