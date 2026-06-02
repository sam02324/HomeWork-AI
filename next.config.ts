import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    cpus: 4, // Limit workers to avoid OOM on Railway's 32-core shared runner
    workerThreads: false,
  },
};

export default nextConfig;
