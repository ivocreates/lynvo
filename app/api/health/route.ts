import { NextResponse } from "next/server";
import { getDb, getEnv } from "@/lib/db/cloudflare";
import { getAppUrl, getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Deployment diagnostic: bindings present and the database answers. Never reports secrets. */
export async function GET() {
  const env = getEnv();
  const report: Record<string, unknown> = {
    bindings: { DB: Boolean(env.DB), MEDIA: Boolean(env.MEDIA) },
    secrets: { BETTER_AUTH_SECRET: Boolean(env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET), RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY) },
    urls: { SITE_URL: getSiteUrl("(unset)"), APP_URL: getAppUrl() },
  };

  try {
    const row = await getDb().prepare("SELECT count(*) AS profiles FROM profiles").first<{ profiles: number }>();
    report.database = { ok: true, profiles: row?.profiles ?? 0 };
  } catch (error) {
    report.database = { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "unknown" };
  }

  const ok = Boolean((report.database as { ok: boolean }).ok && env.DB && env.MEDIA);
  return NextResponse.json({ ok, ...report }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
