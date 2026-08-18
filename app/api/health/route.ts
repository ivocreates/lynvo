import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKeyValue, getSupabaseUrlValue, getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

const PUBLIC_TABLES = ["site_settings", "services", "projects", "team_members", "reviews", "stats", "social_links"];

/**
 * Deployment diagnostic. Reports only presence flags and Supabase error codes —
 * never key material — so it is safe to leave enabled on the public site.
 */
export async function GET() {
  const url = getSupabaseUrlValue();
  const anonKey = getSupabaseAnonKeyValue();

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
    NEXT_PUBLIC_SUPABASE_URL_host: url ? safeHost(url) : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anonKey),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SITE_URL: getSiteUrl("(unset)"),
  };

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "Supabase env vars are missing at runtime. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in BOTH the Cloudflare Workers build variables and the Worker runtime variables, then redeploy.",
        env,
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  // Anonymous client: mirrors exactly what the public pages can read.
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  const tables: Record<string, unknown> = {};
  let ok = true;

  for (const table of PUBLIC_TABLES) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      ok = false;
      tables[table] = { error: error.code ?? "unknown", message: error.message };
    } else {
      tables[table] = { rows: count ?? 0 };
      if ((count ?? 0) === 0) ok = false;
    }
  }

  return NextResponse.json(
    { ok, env, tables },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}

function safeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}
