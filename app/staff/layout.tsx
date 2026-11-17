import Link from "next/link";
import { requireTeamMember, hasRole, getPermissions } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { signOut } from "@/app/admin/actions";
import MobileShell from "@/components/layout/mobile-shell";
import StaffSidebar from "@/components/staff/sidebar";


// Per-user pages: always rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Staff" };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireTeamMember();
  const permissions = await getPermissions(profile);
  const hasConsole = hasRole(profile, "editor") || permissions.some((permission) => permission !== "billing.draft");

  return (
    <div className="flex min-h-screen bg-canvas-warm">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:sticky md:top-0 md:flex md:h-screen">
        <div className="border-b border-white/10 p-4">
          <Link href="/" className="font-display text-lg font-semibold text-text-inverse">
            LYNVO
          </Link>
          <p className="section-stamp mt-1 text-text-inverse/50">TEAM WORKSPACE</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <StaffSidebar role={profile.role} permissions={permissions} />
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-text-inverse">{profile.display_name ?? profile.email}</p>
          <p className="section-stamp mt-0.5 text-text-inverse/50">{ROLE_LABELS[profile.role]}</p>
          {hasConsole && (
            <Link
              href="/admin"
              className="mt-3 block rounded-card border border-white/20 px-3 py-1.5 text-center text-sm text-text-inverse hover:bg-white/10"
            >
              Open LYNVO OS
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 w-full rounded-card border border-white/20 px-3 py-1.5 text-sm text-text-inverse hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileShell
          title="LYNVO TEAM"
          homeHref="/staff"
          stamp="TEAM WORKSPACE"
          nav={<StaffSidebar role={profile.role} permissions={permissions} />}
          footer={
            <>
              <p className="truncate text-sm text-text-inverse">{profile.display_name ?? profile.email}</p>
              <p className="section-stamp mt-0.5 text-text-inverse/50">{ROLE_LABELS[profile.role]}</p>
              {hasConsole && (
                <Link
                  href="/admin"
                  className="mt-3 block rounded-card border border-white/20 px-3 py-2.5 text-center text-sm text-text-inverse hover:bg-white/10"
                >
                  Open LYNVO OS
                </Link>
              )}
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
