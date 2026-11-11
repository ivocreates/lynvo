import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { formatMoney, todayIso } from "@/lib/admin/billing";
import {
  LEAD_STATUSES,
  OPEN_STATUSES,
  phoneDigits,
} from "@/lib/crm";
import PageHeader from "@/components/admin/page-header";
import CrmNav from "@/components/admin/crm-nav";
import AutoSubmitSelect from "@/components/admin/auto-submit-select";
import Flash from "@/components/admin/flash";
import { setLeadStatus } from "./actions";

type Lead = {
  id: string;
  company: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  priority: string;
  site: string;
  estimated_value: number | null;
  currency: string;
  next_follow_up: string | null;
  owner_id: string | null;
  updated_at: string;
};

function startOfWeek() {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

export default async function PipelinePage({ searchParams }: { searchParams: { mine?: string; saved?: string } }) {
  const profile = await requirePermission("crm");
  const today = todayIso();
  const weekStart = startOfWeek();
  const monthStart = `${today.slice(0, 7)}-01`;
  const mine = searchParams.mine === "1";

  const supabase = createClient();
  let leadQuery = supabase
    .from("crm_leads")
    .select("id, company, contact_name, phone, city, status, priority, site, estimated_value, currency, next_follow_up, owner_id, updated_at")
    .order("next_follow_up", { ascending: true, nullsFirst: false })
    .limit(600);
  if (mine) leadQuery = leadQuery.eq("owner_id", profile.id);

  const [{ data: leadRows, error }, { data: activityRows }, { data: targetRows }] = await Promise.all([
    leadQuery,
    supabase.from("crm_activities").select("kind, outcome, occurred_at, created_by").gte("occurred_at", `${weekStart}T00:00:00`),
    supabase.from("site_settings").select("key, value").in("key", ["crm_daily_call_target", "crm_weekly_meeting_target", "crm_monthly_won_target"]),
  ]);

  const leads = (leadRows ?? []) as Lead[];
  const activities = ((activityRows ?? []) as { kind: string; outcome: string | null; occurred_at: string; created_by: string | null }[]).filter(
    (row) => !mine || row.created_by === profile.id
  );
  const targets: Record<string, number> = {};
  for (const row of (targetRows ?? []) as { key: string; value: { text?: string } | null }[]) targets[row.key] = Number(row.value?.text) || 0;

  const callsToday = activities.filter((row) => row.kind === "call" && row.occurred_at.slice(0, 10) === today).length;
  const touchesWeek = activities.filter((row) => ["call", "whatsapp", "email", "meeting", "visit"].includes(row.kind)).length;
  const meetingsWeek = activities.filter((row) => row.outcome === "meeting_booked" || row.kind === "meeting").length;
  const open = leads.filter((lead) => OPEN_STATUSES.includes(lead.status as (typeof OPEN_STATUSES)[number]));
  const due = open.filter((lead) => lead.next_follow_up && lead.next_follow_up <= today);
  const overdue = due.filter((lead) => lead.next_follow_up! < today);
  const wonMonth = leads.filter((lead) => lead.status === "won" && lead.updated_at.slice(0, 10) >= monthStart).length;
  const pipelineValue = open.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);

  const cards = [
    { label: "Calls today", value: `${callsToday}${targets.crm_daily_call_target ? ` / ${targets.crm_daily_call_target}` : ""}`, progress: targets.crm_daily_call_target ? callsToday / targets.crm_daily_call_target : null },
    { label: "Follow-ups due", value: String(due.length), detail: overdue.length ? `${overdue.length} overdue` : "all on time", tone: overdue.length ? "text-error" : undefined },
    { label: "Meetings this week", value: `${meetingsWeek}${targets.crm_weekly_meeting_target ? ` / ${targets.crm_weekly_meeting_target}` : ""}`, detail: `${touchesWeek} touches this week` },
    { label: "Won this month", value: `${wonMonth}${targets.crm_monthly_won_target ? ` / ${targets.crm_monthly_won_target}` : ""}`, detail: `Open pipeline ${formatMoney(pipelineValue, "INR")}` },
  ];

  const statusOptions = LEAD_STATUSES.map((entry) => ({ value: entry.value, label: entry.label }));

  return (
    <div>
      <PageHeader
        stamp="SALES & MARKETING"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${profile.display_name?.split(" ")[0] ?? "there"}`}
        description="Today's calls, follow-ups and the pipeline for lynvo.studio and lynvo.tech."
        action={{ href: "/admin/crm/leads#add", label: "Add lead" }}
      />
      <CrmNav active="pipeline" />
      <Flash success={searchParams.saved ? "Updated." : null} />

      {error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          The CRM is not set up yet. Run migration 0030_crm.sql.
        </p>
      )}

      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/crm" className={`rounded-card px-3 py-1.5 ${!mine ? "bg-ink-900 text-text-inverse" : "border border-border"}`}>
          Everyone
        </Link>
        <Link href="/admin/crm?mine=1" className={`rounded-card px-3 py-1.5 ${mine ? "bg-ink-900 text-text-inverse" : "border border-border"}`}>
          My leads
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="archive-card p-5">
            <p className="section-stamp">{card.label.toUpperCase()}</p>
            <p className={`mt-2 font-display text-3xl font-semibold ${card.tone ?? "text-ink-900"}`}>{card.value}</p>
            {card.progress != null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-warm">
                <div className="h-full bg-brand-700" style={{ width: `${Math.min(100, Math.round(card.progress * 100))}%` }} />
              </div>
            )}
            {card.detail && <p className="mt-1 text-xs text-text-primary/60">{card.detail}</p>}
          </div>
        ))}
      </div>

      <section className="mb-10 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-900">Today&apos;s call list</h2>
          <Link href="/admin/crm/leads?view=due" className="text-sm text-brand-700 underline">
            Open as list
          </Link>
        </div>
        {due.length === 0 ? (
          <p className="mt-3 text-sm text-text-primary/70">
            Nothing due. Pick up new leads from the <Link href="/admin/crm/leads?status=new" className="text-brand-700 underline">New column</Link> or import a research list.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {due.slice(0, 15).map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/admin/crm/leads/${lead.id}`} className="min-w-0">
                  <span className="font-medium text-ink-900">{lead.company}</span>
                  <span className="block text-xs text-text-primary/60">
                    {[lead.contact_name, lead.city].filter(Boolean).join(" · ")} ·{" "}
                    <span className={lead.next_follow_up! < today ? "text-error" : ""}>
                      {lead.next_follow_up! < today ? `overdue since ${lead.next_follow_up}` : "due today"}
                    </span>
                  </span>
                </Link>
                <div className="flex items-center gap-3">
                  {lead.phone && (
                    <a href={`tel:+${phoneDigits(lead.phone)}`} className="rounded-card border border-border px-3 py-1 text-brand-700 hover:bg-canvas-warm">
                      Call
                    </a>
                  )}
                  <Link href={`/admin/crm/leads/${lead.id}`} className="text-brand-700 underline">
                    Log
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Pipeline</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((column) => {
            const items = leads.filter((lead) => lead.status === column.value);
            const value = items.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);
            return (
              <div key={column.value} className="w-64 shrink-0 rounded-card border border-border bg-canvas-warm/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-card border px-2 py-0.5 text-xs font-medium ${column.tone}`}>{column.label}</span>
                  <span className="text-xs text-text-primary/60">
                    {items.length}
                    {value > 0 ? ` · ${formatMoney(value, "INR")}` : ""}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.slice(0, 40).map((lead) => (
                    <li key={lead.id} className="rounded-card border border-border bg-surface p-3 text-sm shadow-sm">
                      <Link href={`/admin/crm/leads/${lead.id}`} className="block">
                        <span className="font-medium text-ink-900">{lead.company}</span>
                        <span className="block text-xs text-text-primary/60">
                          {[lead.contact_name, lead.city].filter(Boolean).join(" · ") || "—"}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
                          {lead.site === "tech" && <span className="rounded bg-ink-900 px-1.5 text-text-inverse">tech</span>}
                          {lead.priority === "high" && <span className="rounded bg-error/10 px-1.5 text-error">high</span>}
                          {lead.next_follow_up && (
                            <span className={lead.next_follow_up < today ? "text-error" : "text-text-primary/60"}>↻ {lead.next_follow_up}</span>
                          )}
                        </span>
                      </Link>
                      <form action={setLeadStatus} className="mt-2">
                        <input type="hidden" name="id" value={lead.id} />
                        <input type="hidden" name="redirect_to" value={mine ? "/admin/crm?mine=1" : "/admin/crm"} />
                        <AutoSubmitSelect name="status" defaultValue={lead.status} options={statusOptions} label={`Stage for ${lead.company}`} />
                      </form>
                    </li>
                  ))}
                  {items.length > 40 && (
                    <li className="text-center text-xs">
                      <Link href={`/admin/crm/leads?status=${column.value}`} className="text-brand-700 underline">
                        +{items.length - 40} more
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
