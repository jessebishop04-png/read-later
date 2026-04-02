import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom", "@mozilla/readability", "@prisma/client", "prisma"],
};

export default nextConfig;
