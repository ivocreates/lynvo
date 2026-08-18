import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKeyValue, getSupabaseUrlValue } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Reachable without a session; recovery links land on /admin/update-password with a fresh session.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password", "/admin/update-password"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.includes(pathname);
  const isGuarded = pathname.startsWith("/admin") || pathname.startsWith("/staff");
  const supabaseUrl = getSupabaseUrlValue();
  const supabaseAnonKey = getSupabaseAnonKeyValue();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isGuarded && !isPublicAdminPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.search = "?setup=1";
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Mutating request cookies keeps the refreshed token visible to the
          // route handler / server action that runs after this middleware.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isGuarded && !isPublicAdminPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
