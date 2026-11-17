import Link from "next/link";
import { requireConsoleAccess } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { signOut } from "@/app/admin/actions";
import MobileShell from "@/components/layout/mobile-shell";
import Sidebar from "@/components/admin/sidebar";


// Per-user pages: always rendered on request.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, permissions } = await requireConsoleAccess();

  return (
    <div className="flex min-h-screen bg-canvas-warm">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:sticky md:top-0 md:flex md:h-screen">
        <div className="border-b border-white/10 p-4">
          <Link href="/admin" className="font-display text-lg font-semibold text-text-inverse">
            LYNVO
          </Link>
          <p className="section-stamp mt-1 text-text-inverse/50">LYNVO OS</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar role={profile.role} permissions={permissions} />
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-text-inverse">
            {profile.display_name ?? profile.email}
          </p>
          <p className="section-stamp mt-0.5 text-text-inverse/50">
            {ROLE_LABELS[profile.role].toUpperCase()}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-3 w-full rounded-card border border-white/20 px-3 py-1.5 text-sm text-text-inverse hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileShell
          title="LYNVO OS"
          homeHref="/admin"
          stamp="LYNVO OS"
          nav={<Sidebar role={profile.role} permissions={permissions} />}
          footer={
            <>
              <p className="truncate text-sm text-text-inverse">{profile.display_name ?? profile.email}</p>
              <p className="section-stamp mt-0.5 text-text-inverse/50">{ROLE_LABELS[profile.role].toUpperCase()}</p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-card border border-white/20 px-3 py-2.5 text-sm text-text-inverse hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </>
          }
        />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
