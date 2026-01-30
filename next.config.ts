import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ["@prisma/client"],
  // Disable Turbopack for builds if it continues to cause issues with Prisma binary resolution
  // experimental: { turbo: { ... } } 
};

export default nextConfig;
