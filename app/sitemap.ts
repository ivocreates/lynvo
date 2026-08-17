import type { MetadataRoute } from "next";

const routes = ["", "/about", "/services", "/archive", "/blog", "/team", "/reviews", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL ?? "https://lynvo.tech";
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
