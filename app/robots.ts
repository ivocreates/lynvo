import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl("https://lynvo.tech");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/staff/", "/client/", "/api/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
