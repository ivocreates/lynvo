import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, hasRole, requirePermission } from "@/lib/auth";
import { formatMoney, todayIso } from "@/lib/admin/billing";
import {
  ACTIVITY_KINDS,
  ACTIVITY_LABELS,
  ACTIVITY_OUTCOMES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  OUTCOME_LABELS,
  QUICK_CALL_OUTCOMES,
  phoneDigits,
  whatsappLink,
} from "@/lib/crm";
import { MESSAGE_TEMPLATES, fillTemplate } from "@/lib/crm-playbook";
import CrmNav from "@/components/admin/crm-nav";
import Flash, { errorText } from "@/components/admin/flash";
import LeadForm, { type LeadRecord } from "@/components/admin/lead-form";
import SubmitButton from "@/components/admin/submit-button";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import CopyButton from "@/components/admin/copy-button";
import { convertLead, deleteLead, logActivity, setLeadStatus, updateLead } from "../../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

type Activity = {
  id: string;
  kind: string;
  outcome: string | null;
  summary: string | null;
  occurred_at: string;
  follow_up_on: string | null;
  created_by: string | null;
};

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; saved?: string; logged?: string; converted?: string; duplicate?: string; error?: string };
}) {
  const profile = await requirePermission("crm");
  const canQuote = await can(profile, "billing.manage");
  const isAdmin = hasRole(profile, "admin");

  const supabase = createClient();
  const [{ data: row }, { data: activityRows }, { data: ownerRows }] = await Promise.all([
    supabase.from("crm_leads").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("crm_activities").select("*").eq("lead_id", params.id).order("occurred_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, email").neq("role", "client").eq("is_active", true).order("display_name"),
  ]);
  if (!row) notFound();

  const lead = row as LeadRecord & {
    status: string;
    client_id: string | null;
    last_contacted_at: string | null;
    lost_reason: string | null;
    currency: string;
    created_at: string;
  };
  const activities = (activityRows ?? []) as Activity[];
  const owners = ((ownerRows ?? []) as { id: string; display_name: string | null; email: string }[]).map((owner) => ({
    id: owner.id,
    label: owner.display_name ?? owner.email,
  }));
  const nameOf = new Map(owners.map((owner) => [owner.id, owner.label]));
  const me = profile.display_name?.split(" ")[0] ?? "the LYNVO team";
  const fill = (text: string) => fillTemplate(text, { company: lead.company, contact: lead.contact_name?.split(" ")[0] ?? undefined, me });
  const wa = whatsappLink(lead.phone);
  const here = `/admin/crm/leads/${lead.id}`;

  const success = searchParams.created
    ? "Lead added. Log your first call below."
    : searchParams.logged
      ? "Logged. Follow-up and stage updated."
      : searchParams.converted
        ? "Converted — a client account now exists for this business."
        : searchParams.saved
          ? "Saved."
          : null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/crm/leads" className="text-sm text-brand-700 underline">
          Leads
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-stamp mb-1">{LEAD_SOURCE_LABELS[lead.source] ?? "LEAD"} · {lead.site === "tech" ? "LYNVO.TECH" : "LYNVO.STUDIO"}</p>
          <h1 className="flex flex-wrap items-center gap-3 font-display text-2xl font-semibold text-ink-900">
            {lead.company}
            <span className={`rounded-card border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_TONES[lead.status] ?? ""}`}>
              {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
            </span>
          </h1>
          <p className="mt-1 text-sm text-text-primary/70">
            {[lead.contact_name && `${lead.contact_name}${lead.designation ? `, ${lead.designation}` : ""}`, lead.industry, lead.city].filter(Boolean).join(" · ")}
            {lead.estimated_value ? ` · worth ~${formatMoney(Number(lead.estimated_value), lead.currency)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <a href={`tel:+${phoneDigits(lead.phone)}`} className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
              Call {lead.phone}
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
              WhatsApp
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
              Email
            </a>
          )}
        </div>
      </div>
      <CrmNav active="leads" />

      <Flash
        success={success}
        error={searchParams.duplicate ? "This business is already in the CRM — you've been taken to the existing lead." : errorText(searchParams.error)}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Log a call</h2>
            <p className="mt-1 text-xs text-text-primary/60">One tap logs the call and schedules the follow-up automatically.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_CALL_OUTCOMES.map((entry) => (
                <form key={entry.outcome} action={logActivity}>
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <input type="hidden" name="kind" value="call" />
                  <input type="hidden" name="outcome" value={entry.outcome} />
                  {entry.followUpDays && <input type="hidden" name="follow_up_days" value={entry.followUpDays} />}
                  <button
                    type="submit"
                    className={`rounded-card border px-3 py-1.5 text-sm hover:bg-canvas-warm ${
                      entry.outcome === "meeting_booked" || entry.outcome === "proposal_requested"
                        ? "border-success/50 text-success"
                        : entry.outcome === "not_interested"
                          ? "border-error/40 text-error"
                          : "border-border text-ink-900"
                    }`}
                  >
                    {entry.label}
                    {entry.followUpDays ? <span className="ml-1 text-xs text-text-primary/50">↻{entry.followUpDays}d</span> : null}
                  </button>
                </form>
              ))}
            </div>

            <details className="mt-5 border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-medium text-ink-900">Log with details (WhatsApp, email, meeting, research...)</summary>
              <form action={logActivity} className="mt-4 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="lead_id" value={lead.id} />
                <div>
                  <label htmlFor="kind" className={LABEL}>
                    Type
                  </label>
                  <select id="kind" name="kind" defaultValue="call" className={FIELD}>
                    {ACTIVITY_KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="outcome" className={LABEL}>
                    Outcome
                  </label>
                  <select id="outcome" name="outcome" defaultValue="" className={FIELD}>
                    <option value="">—</option>
                    {ACTIVITY_OUTCOMES.map((outcome) => (
                      <option key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="summary" className={LABEL}>
                    What happened
                  </label>
                  <textarea id="summary" name="summary" rows={3} className={FIELD} placeholder="Spoke to the owner; wants a website with online menu, budget ~₹15k..." />
                </div>
                <div>
                  <label htmlFor="follow_up_on" className={LABEL}>
                    Follow up on
                  </label>
                  <input id="follow_up_on" name="follow_up_on" type="date" min={todayIso()} className={FIELD} />
                </div>
                <div>
                  <label htmlFor="duration_minutes" className={LABEL}>
                    Minutes
                  </label>
                  <input id="duration_minutes" name="duration_minutes" type="number" min="0" className={FIELD} />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton>Log activity</SubmitButton>
                </div>
              </form>
            </details>
          </section>

          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Timeline</h2>
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/70">No activity yet.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l border-border pl-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-700" aria-hidden="true" />
                    <p className="text-ink-900">
                      <span className="font-medium">{ACTIVITY_LABELS[activity.kind] ?? (activity.kind === "status" ? "Stage" : activity.kind)}</span>
                      {activity.outcome ? ` · ${OUTCOME_LABELS[activity.outcome] ?? activity.outcome}` : ""}
                    </p>
                    {activity.summary && <p className="mt-0.5 whitespace-pre-line text-text-primary/80">{activity.summary}</p>}
                    <p className="mt-0.5 text-xs text-text-primary/50">
                      {new Date(activity.occurred_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      {activity.created_by ? ` · ${nameOf.get(activity.created_by) ?? "team"}` : ""}
                      {activity.follow_up_on ? ` · follow up ${activity.follow_up_on}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <details className="rounded-card border border-border bg-surface p-5">
            <summary className="cursor-pointer font-display text-lg font-semibold text-ink-900">Edit lead details</summary>
            <div className="mt-4">
              <LeadForm lead={lead} owners={owners} action={updateLead} submitLabel="Save lead" />
            </div>
          </details>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-ink-900">Next step</h2>
            <p className="mt-2 text-text-primary/80">
              {lead.next_follow_up ? (
                <>
                  Follow up on <span className={lead.next_follow_up < todayIso() ? "font-medium text-error" : "font-medium"}>{lead.next_follow_up}</span>
                </>
              ) : (
                "No follow-up scheduled."
              )}
              {lead.last_contacted_at && ` · last contact ${new Date(lead.last_contacted_at).toLocaleDateString("en-IN")}`}
            </p>
            <form action={setLeadStatus} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="redirect_to" value={here} />
              <div className="flex-1">
                <label htmlFor="stage" className={LABEL}>
                  Stage
                </label>
                <select id="stage" name="status" defaultValue={lead.status} className={FIELD}>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="lost_reason" className={LABEL}>
                  If lost, why
                </label>
                <input id="lost_reason" name="lost_reason" defaultValue={lead.lost_reason ?? ""} className={FIELD} />
              </div>
              <button type="submit" className="rounded-card border border-border px-3 py-2 text-sm hover:bg-canvas-warm">
                Update
              </button>
            </form>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              {lead.client_id ? (
                <p>
                  Client account:{" "}
                  <Link href={`/admin/clients/${lead.client_id}/account`} className="text-brand-700 underline">
                    open
                  </Link>
                </p>
              ) : null}
              {canQuote && (
                <form action={convertLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="next" value="quote" />
                  <button type="submit" className="w-full rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
                    Create client &amp; prepare quote
                  </button>
                </form>
              )}
              {!lead.client_id && (
                <form action={convertLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="next" value="lead" />
                  <button type="submit" className="w-full rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
                    Mark won &amp; create client account
                  </button>
                </form>
              )}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-ink-900">Message templates</h2>
            <p className="mt-1 text-xs text-text-primary/60">Filled in for {lead.company}. Copy, then paste into WhatsApp or email.</p>
            <ul className="mt-4 space-y-3">
              {MESSAGE_TEMPLATES.filter((template) => (lead.site === "tech" ? true : template.key !== "email_tech")).map((template) => {
                const body = fill(template.body);
                return (
                  <li key={template.key} className="rounded-card border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">
                        {template.title} <span className="text-xs text-text-primary/50">· {template.channel}</span>
                      </span>
                      <span className="flex gap-3">
                        {template.channel === "WhatsApp" && lead.phone && (
                          <a href={whatsappLink(lead.phone, body) ?? "#"} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                            Open in WhatsApp
                          </a>
                        )}
                        <CopyButton value={body} label="Copy" />
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-text-primary/70">{body}</p>
                  </li>
                );
              })}
            </ul>
            <Link href="/admin/crm/playbook" className="mt-3 inline-block text-sm text-brand-700 underline">
              Call scripts &amp; objection handling
            </Link>
          </section>

          {(lead.website || lead.social_url || lead.research_notes) && (
            <section className="rounded-card border border-border bg-surface p-5 text-sm">
              <h2 className="font-display text-lg font-semibold text-ink-900">Research</h2>
              <ul className="mt-2 space-y-1">
                {lead.website && (
                  <li>
                    <a href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                      {lead.website}
                    </a>
                  </li>
                )}
                {lead.social_url && (
                  <li>
                    <a href={/^https?:/.test(lead.social_url) ? lead.social_url : `https://${lead.social_url}`} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                      {lead.social_url}
                    </a>
                  </li>
                )}
              </ul>
              {lead.research_notes && <p className="mt-3 whitespace-pre-line text-text-primary/80">{lead.research_notes}</p>}
            </section>
          )}

          {isAdmin && (
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmSubmit message="Delete this lead and its activity history?" label="Delete lead" />
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
