import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isPlatformPath, isSharedPath, siteForHost, siteHosts } from "@/lib/sites";

function redirectToHost(request: NextRequest, host: string, pathname: string) {
  const url = new URL(request.nextUrl.toString());
  url.protocol = "https:";
  url.host = host;
  url.port = "";
  url.pathname = pathname;
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const site = siteForHost(request.headers.get("host"));
  const hosts = siteHosts();

  if (site !== "any" && !isSharedPath(pathname)) {
    if (site === "app") {
      // The platform has no marketing pages of its own.
      if (pathname === "/") return NextResponse.redirect(new URL("/admin", request.url));
      if (pathname === "/tech" || pathname.startsWith("/tech/")) {
        return redirectToHost(request, hosts.tech, pathname.replace(/^\/tech/, "") || "/");
      }
      if (!isPlatformPath(pathname)) return redirectToHost(request, hosts.studio, pathname);
    }

    if (site === "studio") {
      if (isPlatformPath(pathname)) return redirectToHost(request, hosts.app, pathname);
      if (pathname === "/tech" || pathname.startsWith("/tech/")) {
        return redirectToHost(request, hosts.tech, pathname.replace(/^\/tech/, "") || "/");
      }
    }

    if (site === "tech") {
      if (isPlatformPath(pathname)) return redirectToHost(request, hosts.app, pathname);
      // Certificate verification and the careers board live on the studio site.
      if (pathname.startsWith("/verify/") || pathname === "/careers") {
        return redirectToHost(request, hosts.studio, pathname);
      }
      if (!pathname.startsWith("/tech")) {
        const url = request.nextUrl.clone();
        url.pathname = `/tech${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // Optimistic check only: pages still verify the session and role server-side.
  const guarded = /^\/(admin|staff|client)(\/|$)/.test(pathname);
  const publicAdmin = ["/admin/login", "/admin/reset-password", "/admin/update-password"].includes(pathname);
  if (guarded && !publicAdmin && !getSessionCookie(request)) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static build output and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
