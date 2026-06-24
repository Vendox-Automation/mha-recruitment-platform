import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Backend origin the dev API proxy forwards to (override with API_PROXY_TARGET).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't 308-strip the trailing slash before the API rewrite runs.
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: [
    "https://mha-jobs.up.railway.app",
  ],
  /**
   * Dev-only same-origin API proxy. Set `NEXT_PUBLIC_API_BASE_URL=/api/v1`
   * (see .env.local) to route API calls through this origin; Next forwards
   * them to the backend below so session + CSRF cookies stay first-party.
   * No-op in production, and unused when the app keeps the default absolute
   * API base URL for plain localhost development.
   */
  async rewrites() {
    const proxyTarget = process.env.API_PROXY_TARGET;
    if (!proxyTarget) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${proxyTarget}/api/v1/:path*/`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
