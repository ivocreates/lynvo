import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { todayIso } from "@/lib/admin/billing";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_TONES, OPEN_STATUSES, phoneDigits, whatsappLink } from "@/lib/crm";
import PageHeader from "@/components/admin/page-header";
import CrmNav from "@/components/admin/crm-nav";
import Flash, { errorText } from "@/components/admin/flash";
import LeadForm from "@/components/admin/lead-form";
import SubmitButton from "@/components/admin/submit-button";
import { createLead, importLeads } from "../actions";

type Lead = {
  id: string;
  company: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  industry: string | null;
  status: string;
  source: string;
  site: string;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  owner_id: string | null;
};

const FIELD = "rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; source?: string; site?: string; owner?: string; view?: string; imported?: string; skipped?: string; deleted?: string; error?: string };
}) {
  const profile = await requirePermission("crm");
  const today = todayIso();

  const supabase = createClient();
  let query = supabase
    .from("crm_leads")
    .select("id, company, contact_name, phone, city, industry, status, source, site, next_follow_up, last_contacted_at, owner_id")
    .order("next_follow_up", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (searchParams.view === "due") query = query.lte("next_follow_up", today).in("status", OPEN_STATUSES);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.source) query = query.eq("source", searchParams.source);
  if (searchParams.site === "studio" || searchParams.site === "tech") query = query.eq("site", searchParams.site);
  if (searchParams.owner === "me") query = query.eq("owner_id", profile.id);
  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,()]/g, "");
    query = query.or(`company.ilike.%${term}%,contact_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%,industry.ilike.%${term}%`);
  }

  const [{ data, error }, { data: ownerRows }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, display_name, email").neq("role", "client").eq("is_active", true).order("display_name"),
  ]);

  const leads = (data ?? []) as Lead[];
  const owners = ((ownerRows ?? []) as { id: string; display_name: string | null; email: string }[]).map((owner) => ({
    id: owner.id,
    label: owner.display_name ?? owner.email,
  }));
  const ownerName = new Map(owners.map((owner) => [owner.id, owner.label]));

  const success = searchParams.imported
    ? `Imported ${searchParams.imported} lead${searchParams.imported === "1" ? "" : "s"}${Number(searchParams.skipped) > 0 ? `, skipped ${searchParams.skipped} already in the CRM` : ""}.`
    : searchParams.deleted
      ? "Lead deleted."
      : null;

  return (
    <div>
      <PageHeader stamp="SALES & MARKETING" title="Leads & calls" description={`${leads.length} lead${leads.length === 1 ? "" : "s"} shown`} />
      <CrmNav active="leads" />
      <Flash success={success} error={errorText(searchParams.error)} />

      {error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          The CRM is not set up yet. Run migration 0030_crm.sql.
        </p>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search business, person, phone, city..." className={`${FIELD} min-w-[16rem] flex-1`} />
        <select name="status" defaultValue={searchParams.status ?? ""} className={FIELD} aria-label="Stage">
          <option value="">All stages</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={searchParams.source ?? ""} className={FIELD} aria-label="Source">
          <option value="">All sources</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
        <select name="site" defaultValue={searchParams.site ?? ""} className={FIELD} aria-label="Brand">
          <option value="">Both brands</option>
          <option value="studio">lynvo.studio</option>
          <option value="tech">lynvo.tech</option>
        </select>
        <select name="owner" defaultValue={searchParams.owner ?? ""} className={FIELD} aria-label="Owner">
          <option value="">Anyone</option>
          <option value="me">Mine</option>
        </select>
        <button type="submit" className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
          Filter
        </button>
        <Link href="/admin/crm/leads?view=due" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
          Due today
        </Link>
      </form>

      {leads.length === 0 ? (
        <div className="mb-10 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No leads match. Add one below or import a research list.
        </div>
      ) : (
        <div className="mb-10 overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas-warm">
              <tr>
                <th className="px-4 py-3 font-medium text-ink-900">Business</th>
                <th className="px-4 py-3 font-medium text-ink-900">Stage</th>
                <th className="px-4 py-3 font-medium text-ink-900">Follow-up</th>
                <th className="px-4 py-3 font-medium text-ink-900">Last contact</th>
                <th className="px-4 py-3 font-medium text-ink-900">Owner</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const wa = whatsappLink(lead.phone);
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-canvas-warm/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/crm/leads/${lead.id}`} className="font-medium text-ink-900 hover:underline">
                        {lead.company}
                      </Link>
                      <span className="block text-xs text-text-primary/60">
                        {[lead.contact_name, lead.industry, lead.city].filter(Boolean).join(" · ")}
                        {" · "}
                        {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                        {lead.site === "tech" ? " · tech" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-card border px-2 py-0.5 text-xs ${LEAD_STATUS_TONES[lead.status] ?? ""}`}>
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${lead.next_follow_up && lead.next_follow_up < today ? "text-error" : ""}`}>
                      {lead.next_follow_up ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-primary/70">
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString("en-IN") : "Never"}
                    </td>
                    <td className="px-4 py-3 text-text-primary/70">{lead.owner_id ? ownerName.get(lead.owner_id) ?? "—" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {lead.phone && (
                          <a href={`tel:+${phoneDigits(lead.phone)}`} className="text-brand-700 underline">
                            Call
                          </a>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                            WhatsApp
                          </a>
                        )}
                        <Link href={`/admin/crm/leads/${lead.id}`} className="text-brand-700 underline">
                          Log
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section id="add" className="mb-8 rounded-card border border-border bg-surface p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Add a lead</h2>
        <LeadForm owners={owners} action={createLead} submitLabel="Add lead" defaultOwnerId={profile.id} compact />
      </section>

      <details className="rounded-card border border-border bg-surface p-5">
        <summary className="cursor-pointer font-display text-lg font-semibold text-ink-900">Import a research list</summary>
        <form action={importLeads} className="mt-4 space-y-4">
          <p className="text-sm text-text-primary/70">
            Paste rows from Google Sheets / Excel (or CSV). The first row must be headers. Recognised columns:{" "}
            <code>company, contact, phone, email, website, city, industry, notes</code>. Duplicates (same phone or name) are skipped.
          </p>
          <textarea
            name="csv"
            rows={8}
            required
            placeholder={"company,contact,phone,city,industry\nSunrise Café,Rohan,9876543210,Panaji,Restaurant"}
            className="w-full rounded-card border border-border bg-canvas-warm px-3 py-2 font-mono text-[13px] focus:border-brand-700 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select name="source" defaultValue="google_maps" className={FIELD} aria-label="Source for imported leads">
              {LEAD_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
            <select name="site" defaultValue="studio" className={FIELD} aria-label="Brand for imported leads">
              <option value="studio">lynvo.studio</option>
              <option value="tech">lynvo.tech</option>
            </select>
            <SubmitButton pendingLabel="Importing...">Import</SubmitButton>
          </div>
        </form>
      </details>
    </div>
  );
}
