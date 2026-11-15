import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Local `next dev` gets the D1 / R2 bindings from wrangler.toml (local state in .wrangler/).
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline hydration scripts; dev additionally needs eval for fast refresh.
  // static.cloudflareinsights.com serves the Web Analytics beacon Cloudflare injects.
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Image uploads (team photos, blog images) go through server actions; the default cap is 1 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/staff/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/client/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
