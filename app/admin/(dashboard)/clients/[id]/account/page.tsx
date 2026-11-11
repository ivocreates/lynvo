import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, requirePermission } from "@/lib/auth";
import {
  INVOICE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  RECEIVABLE_STATUSES,
  cycleLabel,
  effectiveStatus,
  formatMoney,
  type InvoiceKind,
} from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import ClientTabs from "@/components/admin/client-tabs";
import StatusBadge from "@/components/admin/status-badge";
import Flash, { errorText } from "@/components/admin/flash";
import SubscriptionForm, { type SubscriptionRecord } from "@/components/admin/subscription-form";
import { invoiceSubscription } from "../../../billing/actions";

type Doc = {
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
  source_quote_id: string | null;
};

type Payment = { id: string; amount: number; currency: string; paid_on: string; method: string; reference: string | null; document_id: string };

type Purchase = { name: string; category: string | null; quantity: number; line_total: number; document_id: string };

function money(rows: { currency: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  if (totals.size === 0) return formatMoney(0, "INR");
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

const BUTTON_PRIMARY = "rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900";

export default async function ClientAccountPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const profile = await requirePermission("clients.manage");
  const billing = await can(profile, "billing.manage");

  const supabase = createClient();
  const { data: clientRow } = await supabase.from("clients").select("id, name, contact_name, email, phone").eq("id", params.id).maybeSingle();
  if (!clientRow) notFound();
  const client = clientRow as { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null };

  const [{ data: docRows }, { data: paymentRows }, { data: subscriptionRows }] = await Promise.all([
    supabase
      .from("billing_documents")
      .select("id, doc_type, number, status, issue_date, due_date, currency, total, balance_due, invoice_kind, source_quote_id")
      .eq("client_id", params.id)
      .order("issue_date", { ascending: false }),
    supabase
      .from("billing_payments")
      .select("id, amount, currency, paid_on, method, reference, document_id")
      .eq("client_id", params.id)
      .order("paid_on", { ascending: false }),
    supabase.from("client_subscriptions").select("*").eq("client_id", params.id).order("status"),
  ]);

  const docs = (docRows ?? []) as Doc[];
  const payments = (paymentRows ?? []) as Payment[];
  const subscriptions = (subscriptionRows ?? []) as SubscriptionRecord[];
  const invoices = docs.filter((doc) => doc.doc_type === "invoice" && doc.status !== "cancelled" && doc.status !== "draft");
  const quotes = docs.filter((doc) => doc.doc_type === "quote");
  const outstanding = invoices.filter((doc) => RECEIVABLE_STATUSES.includes(doc.status));
  const numberById = new Map(docs.map((doc) => [doc.id, doc.number]));

  // What the client has actually bought: line items of issued, non-cancelled invoices.
  const invoiceIds = invoices.map((doc) => doc.id);
  const { data: purchaseRows } =
    invoiceIds.length > 0
      ? await supabase
          .from("billing_document_items")
          .select("name, category, quantity, line_total, document_id")
          .in("document_id", invoiceIds)
      : { data: [] };
  const purchases = (purchaseRows ?? []) as Purchase[];
  const currencyById = new Map(docs.map((doc) => [doc.id, doc.currency]));

  const cards = [
    { label: "Accepted quotes", value: money(quotes.filter((q) => q.status === "accepted").map((q) => ({ currency: q.currency, amount: Number(q.total) }))) },
    { label: "Invoiced", value: money(invoices.map((doc) => ({ currency: doc.currency, amount: Number(doc.total) }))) },
    { label: "Received", value: money(payments.map((p) => ({ currency: p.currency, amount: Number(p.amount) }))), tone: "text-success" },
    {
      label: "Outstanding",
      value: money(outstanding.map((doc) => ({ currency: doc.currency, amount: Number(doc.balance_due ?? doc.total) }))),
      tone: outstanding.length > 0 ? "text-error" : "text-ink-900",
    },
  ];

  return (
    <div>
      <PageHeader
        stamp="CLIENT ACCOUNT"
        title={client.name}
        description={[client.contact_name, client.email, client.phone].filter(Boolean).join(" · ") || "Billing history and plans."}
      />
      <ClientTabs clientId={client.id} active="account" />
      <Flash success={searchParams.saved ? "Saved." : null} error={errorText(searchParams.error)} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="archive-card p-5">
            <p className="section-stamp">{card.label.toUpperCase()}</p>
            <p className={`mt-2 font-display text-xl font-semibold ${card.tone ?? "text-ink-900"}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {billing && (
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href={`/admin/billing/new?type=quote&client=${client.id}`} className={BUTTON_PRIMARY}>
            New quote
          </Link>
          <Link href={`/admin/billing/new?type=invoice&client=${client.id}`} className={BUTTON_PRIMARY}>
            New invoice
          </Link>
          <Link href={`/admin/legal/new?client=${client.id}`} className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
            New agreement
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Quotes &amp; invoices</h2>
            {docs.length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/70">Nothing billed yet.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm">
                <thead className="border-b border-border text-text-primary/60">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Document</th>
                    <th className="py-2 pr-2 font-medium">Issued</th>
                    <th className="py-2 pr-2 font-medium">Status</th>
                    <th className="py-2 pr-2 text-right font-medium">Total</th>
                    <th className="py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2">
                        <Link href={`/admin/billing/${doc.id}`} className="font-medium text-ink-900 hover:underline">
                          {doc.number}
                        </Link>
                        <span className="block text-xs text-text-primary/60">
                          {doc.doc_type === "quote" ? "Quote" : INVOICE_KIND_LABELS[doc.invoice_kind ?? "standard"]}
                          {doc.source_quote_id && numberById.get(doc.source_quote_id) ? ` · from ${numberById.get(doc.source_quote_id)}` : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-2">{doc.issue_date}</td>
                      <td className="py-2 pr-2"><StatusBadge status={effectiveStatus(doc)} /></td>
                      <td className="py-2 pr-2 text-right">{formatMoney(Number(doc.total), doc.currency)}</td>
                      <td className="py-2 text-right font-medium">
                        {doc.doc_type === "invoice" && !["draft", "cancelled"].includes(doc.status)
                          ? formatMoney(Math.max(0, Number(doc.balance_due ?? 0)), doc.currency)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Purchases</h2>
            <p className="mt-1 text-xs text-text-primary/60">Everything on issued invoices.</p>
            {purchases.length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/70">No purchases yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {purchases.map((item, index) => (
                  <li key={`${item.document_id}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="text-ink-900">{item.name}</span>
                      <span className="block text-xs text-text-primary/60">
                        {item.category ?? "Other"} · {numberById.get(item.document_id)}
                      </span>
                    </span>
                    <span className="text-ink-900">{formatMoney(Number(item.line_total), currencyById.get(item.document_id) ?? "INR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Payments</h2>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/70">No payments yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="font-medium text-ink-900">{formatMoney(Number(payment.amount), payment.currency)}</span>
                      <span className="block text-xs text-text-primary/60">
                        {payment.paid_on} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} · {numberById.get(payment.document_id)}
                      </span>
                    </span>
                    <Link href={`/admin/print/receipt/${payment.id}`} className="text-brand-700 underline">
                      Receipt
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Maintenance &amp; plans</h2>
            {subscriptions.length === 0 && <p className="mt-3 text-sm text-text-primary/70">No recurring services.</p>}
            <ul className="mt-4 space-y-3">
              {subscriptions.map((plan) => (
                <li key={plan.id} className="rounded-card border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink-900">{plan.name}</span>
                    <span className="capitalize text-text-primary/70">{plan.status}</span>
                  </div>
                  <p className="text-text-primary/70">
                    {formatMoney(Number(plan.amount), plan.currency)} · {cycleLabel(plan.cycle)} · next {plan.next_invoice_on ?? "—"}
                  </p>
                  {billing && plan.status === "active" && (
                    <form action={invoiceSubscription} className="mt-2">
                      <input type="hidden" name="id" value={plan.id} />
                      <input type="hidden" name="redirect_to" value={`/admin/clients/${client.id}/account`} />
                      <button type="submit" className="text-brand-700 underline">
                        Invoice next period
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {billing && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Add a plan</summary>
                <div className="mt-3">
                  <SubscriptionForm clients={[]} fixedClientId={client.id} redirectTo={`/admin/clients/${client.id}/account`} />
                </div>
              </details>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
