import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Keep local browser QA hydrated when the dev server is reached by loopback IP.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    cpus: 4, // Limit workers to avoid OOM on Railway's 32-core shared runner
    workerThreads: false,
  },
};

const sentrySourceMapsConfigured = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN
);

// Runtime capture uses instrumentation files. The build wrapper is needed only
// when CI has credentials to upload source maps; skipping it keeps local builds fast.
export default sentrySourceMapsConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
