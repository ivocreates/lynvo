import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { signOut } from "@/app/admin/actions";
import MobileShell from "@/components/layout/mobile-shell";
import ClientSidebar from "@/components/client/sidebar";


// Per-user pages: always rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Client portal", robots: { index: false, follow: false } };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient();

  const db = createClient();
  const { data: client } = await db
    .from("clients")
    .select("name")
    .eq("id", profile.client_id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-canvas-warm">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:sticky md:top-0 md:flex md:h-screen">
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
        <MobileShell
          title="LYNVO PORTAL"
          homeHref="/client"
          stamp="CLIENT PORTAL"
          nav={<ClientSidebar />}
          footer={
            <>
              <p className="truncate text-sm text-text-inverse">{(client as { name?: string } | null)?.name ?? profile.email}</p>
              <p className="section-stamp mt-0.5 truncate text-text-inverse/50">{profile.email}</p>
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
