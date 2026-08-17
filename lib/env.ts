/**
 * Supabase env vars are inlined into the client bundle at build time, so a
 * missing value fails silently (empty pages, broken admin login) instead of
 * erroring. These accessors turn that into a loud, actionable message.
 */

const SETUP_HINT =
  "Set it in your local .env.local and, for Cloudflare, in both the Workers Build variables and the Worker runtime variables.";

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL. ${SETUP_HINT}`);
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. ${SETUP_HINT}`);
  return value;
}

/** Normalises SITE_URL, which is often configured without a scheme. */
export function getSiteUrl(fallback = "http://localhost:3000"): string {
  const raw = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return fallback;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}
