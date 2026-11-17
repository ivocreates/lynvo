import Link from "next/link";
import { MessageCircle, Phone, SkipForward, PartyPopper, Mail } from "lucide-react";
import { createClient } from "@/lib/db/server";
import { requirePermission } from "@/lib/auth";
import { todayIso } from "@/lib/admin/billing";
import {
  ACTIVITY_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  OPEN_STATUSES,
  OUTCOME_LABELS,
  QUICK_CALL_OUTCOMES,
  phoneDigits,
  whatsappLink,
} from "@/lib/crm";
import { MESSAGE_TEMPLATES, fillTemplate } from "@/lib/crm-playbook";
import CrmNav from "@/components/admin/crm-nav";
import Flash from "@/components/admin/flash";
import SubmitButton from "@/components/admin/submit-button";
import { logActivity } from "../actions";

type Lead = {
  id: string;
  company: string;
  contact_name: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  industry: string | null;
  status: string;
  priority: string;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  research_notes: string | null;
  owner_id: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const OUTCOME_STYLE: Record<string, string> = {
  meeting_booked: "border-success/50 bg-success/10 text-success",
  proposal_requested: "border-success/50 bg-success/10 text-success",
  interested: "border-brand-700/40 bg-brand-700/5 text-brand-700",
  not_interested: "border-error/40 bg-error/5 text-error",
};

/**
 * Call mode: one lead at a time, built for a phone. Call, tap what happened,
 * and the next lead appears. Logging an outcome moves the follow-up date, so
 * the lead leaves today's queue on its own.
 */
export default async function CallModePage({
  searchParams,
}: {
  searchParams: { all?: string; skip?: string; logged?: string; error?: string };
}) {
  const profile = await requirePermission("crm");
  const today = todayIso();
  const everyone = searchParams.all === "1";
  const skipped = (searchParams.skip ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 60);

  const db = createClient();
  let query = db
    .from("crm_leads")
    .select("id, company, contact_name, designation, phone, email, city, industry, status, priority, next_follow_up, last_contacted_at, notes, research_notes, owner_id")
    .in("status", OPEN_STATUSES)
    .limit(800);
  if (!everyone) query = query.or(`owner_id.eq.${profile.id},owner_id.is.null`);

  const [{ data: leadRows, error }, { data: callRows }, { data: targetRow }] = await Promise.all([
    query,
    db.from("crm_activities").select("id").eq("kind", "call").eq("created_by", profile.id).gte("occurred_at", `${today}T00:00:00`),
    db.from("site_settings").select("value").eq("key", "crm_daily_call_target").maybeSingle(),
  ]);

  const leads = (leadRows ?? []) as Lead[];
  // Due follow-ups first (oldest first, high priority first), then fresh leads nobody has called yet.
  const due = leads
    .filter((lead) => lead.next_follow_up && lead.next_follow_up <= today)
    .sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!) || (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  const fresh = leads
    .filter((lead) => !lead.next_follow_up && !lead.last_contacted_at && lead.phone)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  const queue = [...due, ...fresh].filter((lead) => !skipped.includes(lead.id));
  const lead = queue[0] ?? null;

  const callsToday = (callRows ?? []).length;
  const target = Number((targetRow as { value?: { text?: string } } | null)?.value?.text) || 0;

  const base = everyone ? "/admin/crm/today?all=1" : "/admin/crm/today";
  const withSkip = (ids: string[]) => (ids.length ? `${base}${base.includes("?") ? "&" : "?"}skip=${ids.join(",")}` : base);

  const { data: activityRows } = lead
    ? await db.from("crm_activities").select("kind, outcome, summary, occurred_at").eq("lead_id", lead.id).order("occurred_at", { ascending: false }).limit(3)
    : { data: [] };
  const activities = (activityRows ?? []) as { kind: string; outcome: string | null; summary: string | null; occurred_at: string }[];

  const me = profile.display_name?.split(" ")[0] ?? "the LYNVO team";
  const intro = MESSAGE_TEMPLATES.find((template) => template.channel === "WhatsApp");
  const waText = lead && intro ? fillTemplate(intro.body, { company: lead.company, contact: lead.contact_name?.split(" ")[0] ?? undefined, me }) : undefined;
  const wa = lead ? whatsappLink(lead.phone, waText) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-stamp mb-1">SALES & MARKETING</p>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Call mode</h1>
        </div>
        <div className="flex rounded-card border border-border text-xs">
          <Link href="/admin/crm/today" className={`rounded-l-card px-3 py-2 ${!everyone ? "bg-ink-900 text-text-inverse" : ""}`}>
            Mine
          </Link>
          <Link href="/admin/crm/today?all=1" className={`rounded-r-card px-3 py-2 ${everyone ? "bg-ink-900 text-text-inverse" : ""}`}>
            Everyone
          </Link>
        </div>
      </div>
      <CrmNav active="today" fab={false} />
      <Flash success={searchParams.logged ? "Logged. Here's the next one." : null} error={searchParams.error} />

      {error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">The CRM is not set up yet.</p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface p-3">
          <p className="text-xs text-text-primary/60">Calls today</p>
          <p className="font-display text-2xl font-semibold text-ink-900">
            {callsToday}
            {target ? <span className="text-base text-text-primary/50"> / {target}</span> : null}
          </p>
          {target > 0 && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas-warm">
              <div className="h-full bg-brand-700" style={{ width: `${Math.min(100, Math.round((callsToday / target) * 100))}%` }} />
            </div>
          )}
        </div>
        <div className="rounded-card border border-border bg-surface p-3">
          <p className="text-xs text-text-primary/60">Left in queue</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{queue.length}</p>
          <p className="text-xs text-text-primary/60">
            {due.length} follow-up{due.length === 1 ? "" : "s"} · {fresh.length} new
          </p>
        </div>
      </div>

      {!lead ? (
        <div className="rounded-card border border-border bg-surface p-8 text-center">
          <PartyPopper aria-hidden className="mx-auto h-10 w-10 text-success" />
          <h2 className="mt-3 font-display text-xl font-semibold text-ink-900">Queue clear</h2>
          <p className="mt-1 text-sm text-text-primary/70">
            {skipped.length
              ? `You skipped ${skipped.length}. Go back to them, or add new leads.`
              : "No follow-ups due and no uncalled leads. Add or import new leads to keep going."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {skipped.length > 0 && (
              <Link href={base} className="rounded-card bg-brand-700 px-4 py-3 text-sm font-medium text-text-inverse">
                Go back to skipped leads
              </Link>
            )}
            <Link href="/admin/crm/leads#add" className="rounded-card border border-border px-4 py-3 text-sm font-medium text-ink-900">
              Add a lead
            </Link>
          </div>
        </div>
      ) : (
        <article className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-card border px-2 py-0.5 font-medium ${LEAD_STATUS_TONES[lead.status] ?? ""}`}>{LEAD_STATUS_LABELS[lead.status] ?? lead.status}</span>
              {lead.priority === "high" && <span className="rounded-card bg-error/10 px-2 py-0.5 text-error">High priority</span>}
              {lead.next_follow_up ? (
                <span className={lead.next_follow_up < today ? "text-error" : "text-text-primary/60"}>
                  {lead.next_follow_up < today ? `Overdue since ${lead.next_follow_up}` : "Due today"}
                </span>
              ) : (
                <span className="text-text-primary/60">Never called</span>
              )}
            </div>
            <Link href={`/admin/crm/leads/${lead.id}`} className="mt-2 block font-display text-2xl font-semibold leading-tight text-ink-900 hover:underline">
              {lead.company}
            </Link>
            <p className="mt-1 text-sm text-text-primary/75">
              {[lead.contact_name && `${lead.contact_name}${lead.designation ? `, ${lead.designation}` : ""}`, lead.industry, lead.city].filter(Boolean).join(" · ") ||
                "No contact details yet"}
            </p>
            {lead.phone && <p className="mt-1 font-mono text-sm text-ink-900">{lead.phone}</p>}

            {(lead.notes || lead.research_notes) && (
              <p className="mt-3 line-clamp-4 whitespace-pre-line rounded-card bg-canvas-warm/70 p-3 text-sm text-text-primary/80">
                {[lead.notes, lead.research_notes].filter(Boolean).join("\n")}
              </p>
            )}

            {activities.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-text-primary/70">
                {activities.map((activity, index) => (
                  <li key={index}>
                    <span className="font-medium text-ink-900">{ACTIVITY_LABELS[activity.kind] ?? (activity.kind === "status" ? "Stage" : activity.kind)}</span>
                    {activity.outcome ? ` · ${OUTCOME_LABELS[activity.outcome] ?? activity.outcome}` : ""}
                    {" · "}
                    {new Date(activity.occurred_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {activity.summary ? ` — ${activity.summary.slice(0, 120)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-border bg-canvas-warm/40 p-3">
            {lead.phone ? (
              <a
                href={`tel:+${phoneDigits(lead.phone)}`}
                className="inline-flex items-center justify-center gap-2 rounded-card bg-brand-700 px-4 py-3.5 text-base font-semibold text-text-inverse active:scale-[0.98]"
              >
                <Phone aria-hidden className="h-5 w-5" /> Call
              </a>
            ) : (
              <span className="inline-flex items-center justify-center rounded-card border border-dashed border-border px-4 py-3.5 text-sm text-text-primary/60">No phone number</span>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="inline-flex items-center justify-center gap-2 rounded-card border border-border bg-surface px-4 py-3.5 text-sm font-medium text-ink-900"
              >
                <MessageCircle aria-hidden className="h-5 w-5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                aria-label="Email"
                className="inline-flex items-center justify-center gap-2 rounded-card border border-border bg-surface px-4 py-3.5 text-sm font-medium text-ink-900"
              >
                <Mail aria-hidden className="h-5 w-5" />
                <span className="hidden sm:inline">Email</span>
              </a>
            )}
          </div>

          <form action={logActivity} className="border-t border-border p-4">
            <input type="hidden" name="lead_id" value={lead.id} />
            <input type="hidden" name="kind" value="call" />
            <input type="hidden" name="quick" value="1" />
            <input type="hidden" name="redirect_to" value={withSkip(skipped)} />
            <p className="text-sm font-medium text-ink-900">What happened?</p>
            <textarea
              name="summary"
              rows={2}
              placeholder="Optional note: who you spoke to, budget, what they need…"
              className="mt-2 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-base focus:border-brand-700 focus:outline-none sm:text-sm"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_CALL_OUTCOMES.map((entry) => (
                <button
                  key={entry.outcome}
                  type="submit"
                  name="outcome"
                  value={entry.outcome}
                  className={`rounded-card border px-3 py-3 text-left text-sm font-medium active:scale-[0.98] ${OUTCOME_STYLE[entry.outcome] ?? "border-border bg-surface text-ink-900"}`}
                >
                  {entry.label}
                  <span className="block text-[11px] font-normal opacity-70">
                    {entry.followUpDays ? `call again in ${entry.followUpDays} day${entry.followUpDays === 1 ? "" : "s"}` : entry.outcome === "not_interested" ? "closes the lead" : "moves the stage"}
                  </span>
                </button>
              ))}
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-text-primary/70">Pick a different follow-up date</summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  name="follow_up_on"
                  min={today}
                  aria-label="Follow-up date"
                  className="rounded-card border border-border bg-surface px-3 py-2 text-base sm:text-sm"
                />
                <SubmitButton variant="ghost">Log call with this date</SubmitButton>
              </div>
            </details>
          </form>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <Link href={`/admin/crm/leads/${lead.id}`} className="text-brand-700 underline">
              Full lead
            </Link>
            <Link href={withSkip([...skipped, lead.id])} className="inline-flex items-center gap-1.5 text-text-primary/70 hover:text-ink-900">
              Skip for now <SkipForward aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
