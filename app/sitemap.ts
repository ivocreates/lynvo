import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getStudioUrl, getTechUrl } from "@/lib/env";
import { siteForHost } from "@/lib/sites";

const STUDIO_ROUTES = ["", "/about", "/services", "/archive", "/blog", "/team", "/careers", "/reviews", "/contact", "/llm.txt"];
const TECH_ROUTES = ["", "/services", "/products", "/security", "/work", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteForHost(headers().get("host"));
  if (site === "app") return [];

  const isTech = site === "tech";
  const baseUrl = isTech ? getTechUrl() : getStudioUrl();
  const routes = isTech ? TECH_ROUTES : STUDIO_ROUTES;

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
