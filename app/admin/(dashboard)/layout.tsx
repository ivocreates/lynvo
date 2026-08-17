import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/app/admin/actions";
import Sidebar from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <div className="flex min-h-screen bg-canvas-warm">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:flex">
        <div className="border-b border-white/10 p-4">
          <Link href="/" className="font-display text-lg font-semibold text-text-inverse">
            LYNVO
          </Link>
          <p className="section-stamp mt-1 text-text-inverse/50">CONTENT SYSTEM</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar role={profile.role} />
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-text-inverse">
            {profile.display_name ?? profile.email}
          </p>
          <p className="section-stamp mt-0.5 text-text-inverse/50">
            {profile.role.replace("_", " ").toUpperCase()}
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
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 md:hidden">
          <Link href="/admin" className="font-display font-semibold text-ink-900">
            LYNVO CMS
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-brand-700 underline">
              Sign out
            </button>
          </form>
        </header>
        <div className="md:hidden">
          <div className="bg-ink-900">
            <Sidebar role={profile.role} />
          </div>
        </div>
        <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
