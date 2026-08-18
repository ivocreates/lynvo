import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const routes = ["", "/about", "/services", "/archive", "/blog", "/team", "/careers", "/reviews", "/contact", "/llm.txt"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl("https://lynvo.tech");
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
