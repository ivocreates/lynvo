import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase email links (recovery, invite, signup) and establishes the session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";

  // Only allow same-origin relative paths to prevent open redirects.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/admin/login?error=invalid_link`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
