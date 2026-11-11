import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import {
  INVOICE_KIND_LABELS,
  RECEIVABLE_STATUSES,
  effectiveStatus,
  formatMoney,
  todayIso,
  type InvoiceKind,
} from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import SearchInput from "@/components/admin/search-input";
import StatusBadge from "@/components/admin/status-badge";
import Flash from "@/components/admin/flash";

type DocumentRow = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  client_name: string;
  client_id: string | null;
  currency: string;
  total: number;
  balance_due: number | null;
  invoice_kind: InvoiceKind | null;
};

const TABS = [
  { value: "", label: "All" },
  { value: "quote", label: "Quotes" },
  { value: "invoice", label: "Invoices" },
  { value: "unpaid", label: "Awaiting payment" },
  { value: "overdue", label: "Overdue" },
  { value: "draft", label: "Drafts" },
];

const BUTTON_PRIMARY = "rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900";
const BUTTON = "rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm";

/** Sums amounts per currency so INR and USD are never added together. */
function byCurrency(rows: { currency: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  if (totals.size === 0) return formatMoney(0, "INR");
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

export default async function BillingListPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; saved?: string; deleted?: string };
}) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");
  const tab = searchParams.type ?? "";
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;

  const supabase = createClient();
  let query = supabase
    .from("billing_documents")
    .select("id, doc_type, number, status, issue_date, due_date, client_name, client_id, currency, total, balance_due, invoice_kind")
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (tab === "quote" || tab === "invoice") query = query.eq("doc_type", tab);
  if (tab === "draft") query = query.eq("status", "draft");
  if (tab === "unpaid" || tab === "overdue") query = query.eq("doc_type", "invoice").in("status", RECEIVABLE_STATUSES);
  if (tab === "overdue") query = query.lt("due_date", today);

  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,()]/g, "");
    query = query.or(`number.ilike.%${term}%,client_name.ilike.%${term}%`);
  }

  const [{ data, error }, { data: receivableRows }, { data: paymentRows }, { data: openQuoteRows }] = await Promise.all([
    query,
    supabase.from("billing_documents").select("currency, balance_due, due_date").eq("doc_type", "invoice").in("status", RECEIVABLE_STATUSES),
    supabase.from("billing_payments").select("currency, amount").gte("paid_on", monthStart),
    supabase.from("billing_documents").select("currency, total").eq("doc_type", "quote").eq("status", "sent"),
  ]);

  const rows = (data ?? []) as DocumentRow[];
  const receivables = (receivableRows ?? []) as { currency: string; balance_due: number; due_date: string | null }[];
  const overdue = receivables.filter((row) => row.due_date && row.due_date < today);

  const cards = [
    {
      label: "Outstanding",
      value: byCurrency(receivables.map((row) => ({ currency: row.currency, amount: Number(row.balance_due) }))),
      detail: `${receivables.length} unpaid invoice${receivables.length === 1 ? "" : "s"}`,
      href: "/admin/billing?type=unpaid",
    },
    {
      label: "Overdue",
      value: byCurrency(overdue.map((row) => ({ currency: row.currency, amount: Number(row.balance_due) }))),
      detail: `${overdue.length} past due date`,
      href: "/admin/billing?type=overdue",
      tone: overdue.length > 0 ? "text-error" : undefined,
    },
    {
      label: "Received this month",
      value: byCurrency(((paymentRows ?? []) as { currency: string; amount: number }[]).map((row) => ({ currency: row.currency, amount: Number(row.amount) }))),
      detail: `${(paymentRows ?? []).length} payment${(paymentRows ?? []).length === 1 ? "" : "s"}`,
      href: "/admin/billing/payments",
      tone: "text-success",
    },
    {
      label: "Quotes awaiting reply",
      value: byCurrency(((openQuoteRows ?? []) as { currency: string; total: number }[]).map((row) => ({ currency: row.currency, amount: Number(row.total) }))),
      detail: `${(openQuoteRows ?? []).length} sent quote${(openQuoteRows ?? []).length === 1 ? "" : "s"}`,
      href: "/admin/billing?type=quote",
    },
  ];

  return (
    <div>
      <PageHeader stamp="BILLING" title="Quotes & invoices" description="Quote, convert, invoice, and collect — all in one place." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="archive-card block p-5">
            <p className="section-stamp">{card.label.toUpperCase()}</p>
            <p className={`mt-2 font-display text-2xl font-semibold ${card.tone ?? "text-ink-900"}`}>{card.value}</p>
            <p className="mt-1 text-xs text-text-primary/60">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/billing/new?type=quote" className={BUTTON_PRIMARY}>
          New quote
        </Link>
        <Link href="/admin/billing/new?type=invoice" className={BUTTON_PRIMARY}>
          New invoice
        </Link>
        <Link href="/admin/billing/payments" className={BUTTON}>
          Payments
        </Link>
        <Link href="/admin/billing/subscriptions" className={BUTTON}>
          Maintenance & retainers
        </Link>
        <Link href="/admin/billing/catalog" className={BUTTON}>
          Catalog &amp; packages
        </Link>
        <Link href="/admin/billing/offers" className={BUTTON}>
          Offers
        </Link>
        {isAdmin && (
          <Link href="/admin/billing/settings" className={BUTTON}>
            Letterhead settings
          </Link>
        )}
      </div>

      <Flash
        success={searchParams.saved ? "Saved successfully." : searchParams.deleted === "1" ? "Deleted successfully." : null}
        error={searchParams.deleted === "0" ? "Could not delete that document." : null}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => {
          const active = tab === entry.value;
          return (
            <Link
              key={entry.label}
              href={entry.value ? `/admin/billing?type=${entry.value}` : "/admin/billing"}
              className={`rounded-card px-3 py-1.5 text-sm ${
                active ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"
              }`}
            >
              {entry.label}
            </Link>
          );
        })}
      </div>

      <SearchInput placeholder="Search by number or client..." />

      {error ? (
        <p className="rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load documents. Run the billing migrations (0006 to 0028) if you have not yet.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-primary/70">Nothing here.</p>
          <Link href="/admin/billing/new?type=quote" className="mt-3 inline-block text-sm text-brand-700 underline">
            Create a quote
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas-warm">
              <tr>
                <th className="px-4 py-3 font-medium text-ink-900">Number</th>
                <th className="px-4 py-3 font-medium text-ink-900">Client</th>
                <th className="px-4 py-3 font-medium text-ink-900">Issued</th>
                <th className="px-4 py-3 font-medium text-ink-900">Due</th>
                <th className="px-4 py-3 font-medium text-ink-900">Status</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Total</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = effectiveStatus(row);
                const balance = Number(row.balance_due ?? row.total);
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-canvas-warm/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/billing/${row.id}`} className="font-medium text-ink-900 underline-offset-2 hover:underline">
                        {row.number}
                      </Link>
                      <span className="block text-xs text-text-primary/60">
                        {row.doc_type === "quote" ? "Quote" : INVOICE_KIND_LABELS[row.invoice_kind ?? "standard"]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-primary/85">
                      {row.client_id ? (
                        <Link href={`/admin/clients/${row.client_id}/account`} className="hover:underline">
                          {row.client_name}
                        </Link>
                      ) : (
                        row.client_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-primary/85">{row.issue_date}</td>
                    <td className="px-4 py-3 text-text-primary/85">{row.due_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary/85">{formatMoney(Number(row.total), row.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">
                      {row.doc_type === "invoice" && !["cancelled", "draft"].includes(row.status)
                        ? formatMoney(Math.max(0, balance), row.currency)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
