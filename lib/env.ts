/**
 * Supabase env vars are inlined into the client bundle at build time, so a
 * missing value fails silently (empty pages, broken admin login) instead of
 * erroring. These accessors turn that into a loud, actionable message.
 */

const SETUP_HINT =
  "Set it in your local .env.local and, for Cloudflare, in both the Workers Build variables and the Worker runtime variables.";

export function getSupabaseUrlValue(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function getSupabaseUrl(): string {
  const value = getSupabaseUrlValue();
  if (!value) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL. ${SETUP_HINT}`);
  return value;
}

export function getSupabaseAnonKeyValue(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    undefined
  );
}

export function getSupabaseAnonKey(): string {
  const value = getSupabaseAnonKeyValue();
  if (!value) {
    throw new Error(
      `Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ${SETUP_HINT}`
    );
  }
  return value;
}

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
