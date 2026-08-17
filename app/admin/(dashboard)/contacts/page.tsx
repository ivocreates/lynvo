import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, hasRole } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { updateContactStatus, deleteContact } from "./actions";

const STATUSES = ["new", "read", "replied", "archived"] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-brand-700/10 text-brand-700",
  read: "bg-sand-400/25 text-clay-500",
  replied: "bg-success/10 text-success",
  archived: "bg-border/50 text-text-primary/60",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const profile = await requireAdmin();
  const canDelete = hasRole(profile, "super_admin");
  const active = searchParams.status;

  const supabase = createClient();
  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (active && STATUSES.includes(active as (typeof STATUSES)[number])) {
    query = query.eq("status", active);
  }

  const { data: contacts } = await query;

  return (
    <div>
      <PageHeader
        stamp="LEADS"
        title="Contacts"
        description="Enquiries submitted through the public contact form."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/contacts"
          className={`rounded-card border px-3 py-1.5 text-sm ${
            !active ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-surface"
          }`}
        >
          All
        </Link>
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/contacts?status=${status}`}
            className={`rounded-card border px-3 py-1.5 text-sm capitalize ${
              active === status
                ? "border-brand-700 bg-brand-700 text-text-inverse"
                : "border-border hover:bg-surface"
            }`}
          >
            {status}
          </Link>
        ))}
      </div>

      {!contacts || contacts.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No enquiries here yet.
        </div>
      ) : (
        <ul className="space-y-4">
          {contacts.map((contact: Record<string, any>) => (
            <li key={contact.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900">{contact.name}</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-brand-700 underline break-all"
                  >
                    {contact.email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${
                      STATUS_STYLES[contact.status] ?? ""
                    }`}
                  >
                    {contact.status}
                  </span>
                  <span className="text-xs text-text-primary/50">
                    {new Date(contact.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-text-primary/85">
                {contact.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <form action={updateContactStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={contact.id} />
                  <label htmlFor={`status-${contact.id}`} className="sr-only">
                    Status
                  </label>
                  <select
                    id={`status-${contact.id}`}
                    name="status"
                    defaultValue={contact.status}
                    className="rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-sm capitalize focus:border-brand-700 focus:outline-none"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                  >
                    Update
                  </button>
                </form>

                <a
                  href={`mailto:${contact.email}?subject=Re: your enquiry`}
                  className="text-sm text-brand-700 underline"
                >
                  Reply
                </a>

                {canDelete && (
                  <form action={deleteContact} className="ml-auto">
                    <input type="hidden" name="id" value={contact.id} />
                    <ConfirmSubmit message="Permanently delete this enquiry?" />
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
