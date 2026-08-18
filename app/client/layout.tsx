import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";
import ClientSidebar from "@/components/client/sidebar";

export const metadata = { title: "Client portal", robots: { index: false, follow: false } };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient();

  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", profile.client_id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-canvas-warm">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:flex">
        <div className="border-b border-white/10 p-4">
          <Link href="/" className="font-display text-lg font-semibold text-text-inverse">
            LYNVO
          </Link>
          <p className="section-stamp mt-1 text-text-inverse/50">CLIENT PORTAL</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ClientSidebar />
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm text-text-inverse">
            {(client as { name?: string } | null)?.name ?? profile.email}
          </p>
          <p className="section-stamp mt-0.5 truncate text-text-inverse/50">{profile.email}</p>
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
          <Link href="/client" className="font-display font-semibold text-ink-900">
            LYNVO PORTAL
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-brand-700 underline">
              Sign out
            </button>
          </form>
        </header>
        <div className="md:hidden">
          <div className="bg-ink-900">
            <ClientSidebar />
          </div>
        </div>
        <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
