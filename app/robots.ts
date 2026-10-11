import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

// Only the marketing page and the sign-in pages are meant to be found.
// Customer share links and the signed-in app are kept out of search.
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api", "/quote", "/invoice", "/status", "/book", "/r"] }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
