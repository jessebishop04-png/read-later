import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Parent folder has another package-lock.json; pin the app root so Next doesn't
  // resolve modules from C:\Users\jesse and break page loads.
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: [
    "jsdom",
    "@mozilla/readability",
    "@prisma/client",
    "prisma",
    "defuddle",
    "playwright-core",
  ],
};

export default nextConfig;
