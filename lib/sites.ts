/**
 * One deployment, three domains:
 *
 *   app.lynvo.studio  -> /admin, /staff, /client (team & client platform)
 *   lynvo.studio      -> app/(public)            (launch your venture online)
 *   lynvo.tech        -> app/tech                (custom software & security)
 *
 * Host routing only switches on for the configured hosts, so localhost and
 * *.workers.dev previews keep serving every route directly (/tech included).
 * Edge-safe: used by middleware.
 */

export type SiteKind = "app" | "studio" | "tech" | "any";

function hostOf(url: string | undefined, fallback: string) {
  const value = (url ?? "").trim();
  if (!value) return fallback;
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return fallback;
  }
}

export function siteHosts() {
  return {
    app: hostOf(process.env.APP_URL, "app.lynvo.studio"),
    studio: hostOf(process.env.STUDIO_URL, "lynvo.studio"),
    tech: hostOf(process.env.TECH_URL, "lynvo.tech"),
  };
}

export function siteForHost(rawHost: string | null | undefined): SiteKind {
  const host = (rawHost ?? "").toLowerCase().replace(/^www\./, "");
  const hosts = siteHosts();
  // Until lynvo.studio and lynvo.tech point at this Worker, the app host keeps
  // serving the public pages too. Set SPLIT_DOMAINS=1 once they are attached.
  if (host === hosts.app) return process.env.SPLIT_DOMAINS === "1" ? "app" : "any";
  if (host === hosts.studio) return "studio";
  if (host === hosts.tech) return "tech";
  return "any";
}

/** Paths that belong to the platform, never to a marketing site. */
export const PLATFORM_PREFIXES = ["/admin", "/staff", "/client", "/auth"];

export const isPlatformPath = (pathname: string) =>
  PLATFORM_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/** Served the same on every host (framework assets, health checks, metadata routes). */
export const isSharedPath = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname.startsWith("/api/") ||
  pathname === "/robots.txt" ||
  pathname === "/sitemap.xml" ||
  pathname === "/favicon.ico" ||
  pathname === "/llm.txt" ||
  /\.[a-z0-9]{2,5}$/i.test(pathname);
