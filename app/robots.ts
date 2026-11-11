import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getAppUrl, getStudioUrl, getTechUrl } from "@/lib/env";
import { siteForHost } from "@/lib/sites";

export default function robots(): MetadataRoute.Robots {
  const site = siteForHost(headers().get("host"));

  // The platform must never be indexed.
  if (site === "app") {
    return { rules: [{ userAgent: "*", disallow: "/" }], host: getAppUrl() };
  }

  const baseUrl = site === "tech" ? getTechUrl() : getStudioUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/staff/", "/client/", "/api/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
