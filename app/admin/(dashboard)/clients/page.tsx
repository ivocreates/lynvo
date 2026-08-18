import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/page-header";
import { ENGAGEMENT_LABELS, ENGAGEMENT_STYLES, type Client, type Engagement } from "@/lib/clients";
import { createClientRecord } from "./actions";

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-sand-400/25 text-clay-500",
  archived: "bg-border/50 text-text-primary/60",
};

export default async function ClientsPage() {
  await requireStaff();

  const supabase = createClient();
  const [{ data: clientRows }, { data: engagementRows }] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("client_engagements").select("id, client_id, title, status, progress"),
  ]);

  const clients = (clientRows ?? []) as Client[];
  const engagements = (engagementRows ?? []) as Engagement[];

  return (
    <div>
      <PageHeader
        stamp="CLIENTS"
        title="Clients"
        description="Manage client accounts, their engagements, and portal access."
      />

      <form action={createClientRecord} className="mb-8 rounded-card border border-border bg-surface p-5">
        <p className="section-stamp mb-3">NEW CLIENT</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              Company
            </label>
            <input id="name" name="name" required className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="contact_name" className={LABEL_CLASS}>
              Contact
            </label>
            <input id="contact_name" name="contact_name" className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              Email
            </label>
            <input id="email" name="email" type="email" className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="phone" className={LABEL_CLASS}>
              Phone
            </label>
            <input id="phone" name="phone" className={FIELD_CLASS} />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          Add client
        </button>
      </form>

      {clients.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No clients yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => {
            const theirs = engagements.filter((engagement) => engagement.client_id === client.id);
            const active = theirs.filter(
              (engagement) => !["delivered", "cancelled"].includes(engagement.status)
            );

            return (
              <li key={client.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="font-display font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {client.name}
                    </Link>
                    <p className="mt-1 text-xs text-text-primary/60">
                      {[client.contact_name, client.email].filter(Boolean).join(" · ") || "No contact yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-text-primary/60">
                      {theirs.length} engagement{theirs.length === 1 ? "" : "s"}
                      {active.length > 0 ? ` · ${active.length} active` : ""}
                    </span>
                    <span
                      className={`rounded-card px-2 py-1 font-mono uppercase ${STATUS_STYLES[client.status] ?? ""}`}
                    >
                      {client.status}
                    </span>
                  </div>
                </div>

                {active.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {active.map((engagement) => (
                      <li
                        key={engagement.id}
                        className={`rounded-card px-2 py-1 text-xs ${ENGAGEMENT_STYLES[engagement.status]}`}
                      >
                        {engagement.title} · {ENGAGEMENT_LABELS[engagement.status]} · {engagement.progress}%
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
