import type { NextConfig } from "next";

// A strict Content-Security-Policy is deliberately not set yet: Next's
// inline hydration scripts need per-request nonces (set up via proxy.ts),
// and a wrong CSP silently breaks pages. These headers carry no such risk.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Unlisted share links (tokens in the URL) shouldn't end up in search results.
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// The signed-in product lives under /app. These old top-level paths (from
// emailed links, bookmarks, or notifications saved before the move) forward
// there. Public customer pages (/quote, /invoice, /status, /book) are not in
// this list on purpose.
const APP_SEGMENTS = "dashboard|leads|customers|quotations|invoices|vehicles|inventory|growth|reports|notifications|integrations|settings|guide";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: `/:segment(${APP_SEGMENTS})/:path*`, destination: "/app/:segment/:path*", permanent: false }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/status/:path*", headers: noIndex },
      { source: "/quote/:path*", headers: noIndex },
      { source: "/invoice/:path*", headers: noIndex },
      { source: "/app/:path*", headers: noIndex },
    ];
  },
};

export default nextConfig;
