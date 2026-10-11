import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  return [
    { url: `${site}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
