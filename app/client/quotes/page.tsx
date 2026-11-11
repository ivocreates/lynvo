import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  INVOICE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  RECEIVABLE_STATUSES,
  cycleLabel,
  effectiveStatus,
  formatMoney,
  type InvoiceKind,
} from "@/lib/admin/billing";
import StatusBadge from "@/components/admin/status-badge";
import { receiptNumber } from "@/components/documents/payment-receipt";

export const metadata = { robots: { index: false, follow: false } };

type Row = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total: number;
  balance_due: number | null;
  invoice_kind: InvoiceKind | null;
};

type Payment = { id: string; amount: number; currency: string; paid_on: string; method: string; document_id: string };
type Subscription = { id: string; name: string; amount: number; currency: string; cycle: string; next_invoice_on: string | null; status: string };

function sum(rows: { currency: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  if (totals.size === 0) return formatMoney(0, "INR");
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

export default async function ClientBillingPage() {
  const profile = await requireClient();

  const supabase = createClient();
  const [{ data }, { data: paymentRows }, { data: subscriptionRows }] = await Promise.all([
    supabase
      .from("billing_documents")
      .select("id, doc_type, number, status, issue_date, due_date, currency, total, balance_due, invoice_kind")
      .eq("client_id", profile.client_id)
      .order("issue_date", { ascending: false }),
    supabase
      .from("billing_payments")
      .select("id, amount, currency, paid_on, method, document_id")
      .eq("client_id", profile.client_id)
      .order("paid_on", { ascending: false }),
    supabase
      .from("client_subscriptions")
      .select("id, name, amount, currency, cycle, next_invoice_on, status")
      .eq("client_id", profile.client_id),
  ]);

  const rows = (data ?? []) as Row[];
  const payments = (paymentRows ?? []) as Payment[];
  const subscriptions = (subscriptionRows ?? []) as Subscription[];
  const invoices = rows.filter((row) => row.doc_type === "invoice");
  const quotes = rows.filter((row) => row.doc_type === "quote");
  const pendingQuotes = quotes.filter((row) => row.status === "sent");
  const unpaid = invoices.filter((row) => RECEIVABLE_STATUSES.includes(row.status));
  const numberById = new Map(rows.map((row) => [row.id, row.number]));

  return (
    <div>
      <p className="section-stamp">BILLING</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Your account</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Quotes, invoices, payments and plans with LYNVO. Open any document to read it in full or save it as a PDF.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="section-stamp">AMOUNT DUE</p>
          <p className={`mt-2 font-display text-2xl font-semibold ${unpaid.length ? "text-ink-900" : "text-success"}`}>
            {sum(unpaid.map((row) => ({ currency: row.currency, amount: Number(row.balance_due ?? row.total) })))}
          </p>
          <p className="mt-1 text-xs text-text-primary/60">{unpaid.length} open invoice{unpaid.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="section-stamp">PAID TO DATE</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900">
            {sum(payments.map((row) => ({ currency: row.currency, amount: Number(row.amount) })))}
          </p>
          <p className="mt-1 text-xs text-text-primary/60">{payments.length} payment{payments.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="section-stamp">QUOTES TO REVIEW</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{pendingQuotes.length}</p>
          <p className="mt-1 text-xs text-text-primary/60">Accept online in one click</p>
        </div>
      </div>

      {pendingQuotes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-900">Awaiting your approval</h2>
          <ul className="mt-4 space-y-3">
            {pendingQuotes.map((row) => (
              <DocLink key={row.id} row={row} highlight />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-text-primary/70">No invoices yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {invoices.map((row) => (
              <DocLink key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-900">Payments &amp; receipts</h2>
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{formatMoney(Number(payment.amount), payment.currency)}</p>
                  <p className="text-xs text-text-primary/60">
                    {payment.paid_on} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} · for {numberById.get(payment.document_id) ?? "invoice"}
                  </p>
                </div>
                <Link href={`/client/receipts/${payment.id}`} className="text-brand-700 underline">
                  Receipt {receiptNumber(payment.id, payment.paid_on)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {subscriptions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-900">Your plans</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {subscriptions.map((plan) => (
              <li key={plan.id} className="rounded-card border border-border bg-surface p-5 text-sm">
                <p className="font-medium text-ink-900">{plan.name}</p>
                <p className="mt-1 text-text-primary/70">
                  {formatMoney(Number(plan.amount), plan.currency)} · {cycleLabel(plan.cycle)}
                </p>
                <p className="mt-1 text-xs text-text-primary/60">
                  {plan.status === "paused" ? "Paused" : plan.next_invoice_on ? `Next invoice ${plan.next_invoice_on}` : "Active"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {quotes.filter((row) => row.status !== "sent").length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-900">Past quotations</h2>
          <ul className="mt-4 space-y-3">
            {quotes
              .filter((row) => row.status !== "sent")
              .map((row) => (
                <DocLink key={row.id} row={row} />
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DocLink({ row, highlight = false }: { row: Row; highlight?: boolean }) {
  const isInvoice = row.doc_type === "invoice";
  const balance = Number(row.balance_due ?? row.total);
  return (
    <li>
      <Link
        href={`/client/quotes/${row.id}`}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-card border bg-surface p-5 hover:border-brand-700 ${
          highlight ? "border-brand-700/50" : "border-border"
        }`}
      >
        <div>
          <p className="font-medium text-ink-900">
            {isInvoice ? INVOICE_KIND_LABELS[row.invoice_kind ?? "standard"].replace("Full invoice", "Invoice") : "Quotation"} {row.number}
          </p>
          <p className="mt-1 text-sm text-text-primary/70">
            Issued {row.issue_date}
            {row.due_date ? ` · ${isInvoice ? "due" : "valid until"} ${row.due_date}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={effectiveStatus(row)} />
          <span className="text-right">
            <span className="block font-medium text-ink-900">{formatMoney(Number(row.total), row.currency)}</span>
            {isInvoice && balance > 0 && balance < Number(row.total) && (
              <span className="block text-xs text-text-primary/60">{formatMoney(balance, row.currency)} due</span>
            )}
          </span>
        </div>
      </Link>
    </li>
  );
}
