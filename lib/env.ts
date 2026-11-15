/** Site URLs. Secrets and bindings are read from the Worker environment (lib/db/cloudflare.ts). */

function normaliseUrl(raw: string | undefined, fallback: string) {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return fallback;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** The team & client platform (app.lynvo.studio). Auth links must land here. */
export function getAppUrl(): string {
  return normaliseUrl(process.env.APP_URL, getSiteUrl("https://app.lynvo.studio"));
}

/** The studio marketing site (lynvo.studio). */
export function getStudioUrl(): string {
  return normaliseUrl(process.env.STUDIO_URL, "https://lynvo.studio");
}

/** The software & security site (lynvo.tech). */
export function getTechUrl(): string {
  return normaliseUrl(process.env.TECH_URL, "https://lynvo.tech");
}

/** Normalises SITE_URL, which is often configured without a scheme. */
export function getSiteUrl(fallback = "http://localhost:3000"): string {
  const raw = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return fallback;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}
