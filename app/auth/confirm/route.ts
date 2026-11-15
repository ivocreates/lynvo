import { NextResponse, type NextRequest } from "next/server";

/**
 * Old Supabase email links (sent before the move to Better Auth) pointed here.
 * They can no longer be verified, so send people to request a fresh link.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/admin/reset-password?expired=1", request.url));
}
