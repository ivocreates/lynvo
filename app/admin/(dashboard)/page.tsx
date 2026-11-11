import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireConsoleAccess, hasRole } from "@/lib/auth";
import { RECEIVABLE_STATUSES, formatMoney, todayIso } from "@/lib/admin/billing";
import { OPEN_STATUSES } from "@/lib/crm";
import PageHeader from "@/components/admin/page-header";

type Metric = { label: string; value: string | number; detail: string; href: string; tone?: string };

async function count(table: string, filter?: (query: any) => any) {
  const supabase = createClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count: total } = await query;
  return total ?? 0;
}

function sumByCurrency(rows: { currency: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  if (totals.size === 0) return formatMoney(0, "INR");
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

export default async function DashboardPage({ searchParams }: { searchParams: { denied?: string } }) {
  const { profile, permissions } = await requireConsoleAccess();
  const has = (permission: (typeof permissions)[number]) => permissions.includes(permission);
  const isManager = hasRole(profile, "junior_partner");
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;
  const supabase = createClient();

  const sections: { title: string; metrics: Metric[] }[] = [];

  if (has("crm")) {
    const [due, open, newEnquiries, callsToday] = await Promise.all([
      count("crm_leads", (q) => q.lte("next_follow_up", today).in("status", OPEN_STATUSES)),
      count("crm_leads", (q) => q.in("status", OPEN_STATUSES)),
      count("contacts", (q) => q.eq("status", "new")),
      count("crm_activities", (q) => q.eq("kind", "call").gte("occurred_at", `${today}T00:00:00`)),
    ]);
    sections.push({
      title: "Sales & marketing",
      metrics: [
        { label: "Follow-ups due", value: due, detail: "calls to make today", href: "/admin/crm/leads?view=due", tone: due ? "text-error" : undefined },
        { label: "Calls today", value: callsToday, detail: "logged by the team", href: "/admin/crm" },
        { label: "Open leads", value: open, detail: "in the pipeline", href: "/admin/crm" },
        { label: "New enquiries", value: newEnquiries, detail: "from the websites", href: "/admin/contacts?status=new" },
      ],
    });
  }

  if (has("billing.manage")) {
    const [{ data: receivables }, { data: payments }, { data: quotes }, { data: subscriptions }] = await Promise.all([
      supabase.from("billing_documents").select("currency, balance_due, due_date").eq("doc_type", "invoice").in("status", RECEIVABLE_STATUSES),
      supabase.from("billing_payments").select("currency, amount").gte("paid_on", monthStart),
      supabase.from("billing_documents").select("id").eq("doc_type", "quote").eq("status", "accepted"),
      supabase.from("client_subscriptions").select("id").eq("status", "active").lte("next_invoice_on", today),
    ]);
    const open = (receivables ?? []) as { currency: string; balance_due: number; due_date: string | null }[];
    const overdue = open.filter((row) => row.due_date && row.due_date < today);
    sections.push({
      title: "Billing",
      metrics: [
        { label: "Outstanding", value: sumByCurrency(open.map((row) => ({ currency: row.currency, amount: Number(row.balance_due) }))), detail: `${open.length} unpaid invoices`, href: "/admin/billing?type=unpaid" },
        { label: "Overdue", value: overdue.length, detail: sumByCurrency(overdue.map((row) => ({ currency: row.currency, amount: Number(row.balance_due) }))), href: "/admin/billing?type=overdue", tone: overdue.length ? "text-error" : undefined },
        { label: "Received this month", value: sumByCurrency(((payments ?? []) as { currency: string; amount: number }[]).map((row) => ({ currency: row.currency, amount: Number(row.amount) }))), detail: "payments recorded", href: "/admin/billing/payments", tone: "text-success" },
        { label: "To invoice", value: (quotes ?? []).length + (subscriptions ?? []).length, detail: `${(quotes ?? []).length} accepted quotes · ${(subscriptions ?? []).length} plans due`, href: "/admin/billing?type=quote" },
      ],
    });
  }

  if (has("clients.manage")) {
    const [activeClients, awaitingSignature, inReview] = await Promise.all([
      count("clients", (q) => q.eq("status", "active")),
      count("client_agreements", (q) => q.eq("status", "sent")),
      count("client_deliverables", (q) => q.eq("status", "revision_requested")),
    ]);
    sections.push({
      title: "Clients",
      metrics: [
        { label: "Active clients", value: activeClients, detail: "accounts", href: "/admin/clients" },
        { label: "Awaiting signature", value: awaitingSignature, detail: "agreements sent", href: "/admin/legal?status=sent" },
        { label: "Changes requested", value: inReview, detail: "deliverables to revise", href: "/admin/clients" },
      ],
    });
  }

  if (has("website")) {
    const [published, drafts, pendingReviews] = await Promise.all([
      count("projects", (q) => q.eq("status", "published")),
      count("blog_posts", (q) => q.eq("status", "draft")),
      count("reviews", (q) => q.eq("status", "pending")),
    ]);
    sections.push({
      title: "Websites",
      metrics: [
        { label: "Published work", value: published, detail: "portfolio entries", href: "/admin/projects" },
        { label: "Draft posts", value: drafts, detail: "blog drafts", href: "/admin/blog" },
        { label: "Pending reviews", value: pendingReviews, detail: "awaiting moderation", href: "/admin/reviews" },
      ],
    });
  }

  if (isManager) {
    const [openTasks, people] = await Promise.all([
      count("staff_tasks", (q) => q.in("status", ["todo", "working", "blocked"])),
      count("profiles", (q) => q.eq("is_active", true).neq("role", "client")),
    ]);
    sections.push({
      title: "Team",
      metrics: [
        { label: "Open tasks", value: openTasks, detail: "across the team", href: "/admin/tasks" },
        { label: "Team members", value: people, detail: "active", href: "/admin/admins" },
      ],
    });
  }

  const { data: recent } = await supabase
    .from("audit_logs")
    .select("action, entity, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div>
      <PageHeader
        stamp="LYNVO OS"
        title={`Welcome, ${profile.display_name ?? profile.email}`}
        description="Everything that needs you today, across sales, billing, clients and the websites."
      />

      {searchParams.denied && (
        <p className="mb-6 rounded-card border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          You do not have permission to open that section. Ask an admin to grant it under Access &amp; permissions.
        </p>
      )}

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {section.metrics.map((metric) => (
                <Link key={metric.label} href={metric.href} className="archive-card block p-5">
                  <p className="section-stamp">{metric.label.toUpperCase()}</p>
                  <p className={`mt-2 font-display text-2xl font-semibold ${metric.tone ?? "text-ink-900"}`}>{metric.value}</p>
                  <p className="mt-1 text-xs text-text-primary/60">{metric.detail}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {recent && recent.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent activity</h2>
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {recent.map((entry: Record<string, any>, index: number) => (
              <li key={index} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-text-primary/85">
                  <span className="font-mono text-xs uppercase text-brand-700">{entry.action}</span> {entry.entity.replace(/_/g, " ")}
                  {entry.metadata?.title ? ` — ${entry.metadata.title}` : ""}
                </span>
                <span className="text-xs text-text-primary/50">{new Date(entry.created_at).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
