import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import {
  INVOICE_KIND_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  effectiveStatus,
  formatMoney,
  recurringTotals,
  todayIso,
  type InvoiceKind,
} from "@/lib/admin/billing";
import { ITEM_COLUMNS, getSetting, normaliseItems } from "@/lib/admin/billing-server";
import StatusBadge from "@/components/admin/status-badge";
import Flash, { errorText } from "@/components/admin/flash";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SubmitButton from "@/components/admin/submit-button";
import ConvertQuoteForm from "@/components/admin/convert-quote-form";
import {
  deleteDocument,
  deletePayment,
  duplicateDocument,
  recordPayment,
  setDocumentStatus,
} from "../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const BUTTON = "rounded-card border border-border px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-canvas-warm";

type Doc = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number | null;
  balance_due: number | null;
  invoice_kind: InvoiceKind | null;
  source_quote_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  notes: string | null;
};

type Linked = { id: string; number: string; status: string; total: number; balance_due: number | null; invoice_kind: InvoiceKind | null; issue_date: string; due_date: string | null; doc_type: string };

type Payment = { id: string; amount: number; paid_on: string; method: string; reference: string | null; notes: string | null };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BillingDocumentHub({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; converted?: string; paid?: string; error?: string };
}) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");

  const supabase = createClient();
  const { data: row } = await supabase.from("billing_documents").select("*").eq("id", params.id).maybeSingle();
  if (!row) notFound();

  const doc = row as unknown as Doc;
  const isQuote = doc.doc_type === "quote";
  const status = effectiveStatus(doc);
  const total = Number(doc.total);
  const paid = Number(doc.amount_paid ?? 0);
  const balance = Number(doc.balance_due ?? total - paid);

  const [{ data: itemRows }, { data: linkedRows }, { data: paymentRows }, { data: sourceRow }, advanceSetting] =
    await Promise.all([
      supabase.from("billing_document_items").select(ITEM_COLUMNS).eq("document_id", doc.id).order("position"),
      // Quote: its invoices. Invoice: siblings raised from the same quote.
      supabase
        .from("billing_documents")
        .select("id, number, status, total, balance_due, invoice_kind, issue_date, due_date, doc_type")
        .eq("source_quote_id", isQuote ? doc.id : doc.source_quote_id ?? "00000000-0000-0000-0000-000000000000")
        .order("issue_date"),
      isQuote
        ? Promise.resolve({ data: [] })
        : supabase.from("billing_payments").select("id, amount, paid_on, method, reference, notes").eq("document_id", doc.id).order("paid_on"),
      doc.source_quote_id
        ? supabase.from("billing_documents").select("id, number, total, currency").eq("id", doc.source_quote_id).maybeSingle()
        : Promise.resolve({ data: null }),
      getSetting(supabase, "billing_advance_percent"),
    ]);

  const items = normaliseItems(itemRows);
  const linked = ((linkedRows ?? []) as Linked[]).filter((entry) => entry.doc_type === "invoice");
  const payments = (paymentRows ?? []) as Payment[];
  const source = sourceRow as { id: string; number: string; total: number; currency: string } | null;
  const invoicedFromQuote = linked.filter((entry) => entry.status !== "cancelled").reduce((sum, entry) => sum + Number(entry.total), 0);
  const recurring = recurringTotals(items);
  const hasRecurring = items.some((item) => item.recurring !== "one_time");
  const paidPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const label = isQuote ? "Quotation" : doc.invoice_kind && doc.invoice_kind !== "standard" ? INVOICE_KIND_LABELS[doc.invoice_kind] : "Invoice";
  const here = `/admin/billing/${doc.id}`;

  const success = searchParams.converted
    ? "Invoice created. Review it, then mark it as sent when it goes to the client."
    : searchParams.paid
      ? "Payment recorded. The invoice balance and status are updated."
      : searchParams.saved
        ? "Saved."
        : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/billing" className="text-sm text-brand-700 underline">
            Quotes &amp; invoices
          </Link>
          <p className="section-stamp mb-1 mt-3">{label.toUpperCase()}</p>
          <h1 className="flex flex-wrap items-center gap-3 font-display text-2xl font-semibold text-ink-900">
            {doc.number}
            <StatusBadge status={status} />
          </h1>
          <p className="mt-1 text-sm text-text-primary/70">
            {doc.client_id ? (
              <Link href={`/admin/clients/${doc.client_id}/account`} className="text-brand-700 underline">
                {doc.client_name}
              </Link>
            ) : (
              doc.client_name
            )}{" "}
            · issued {formatDate(doc.issue_date)}
            {doc.due_date ? ` · ${isQuote ? "valid until" : "due"} ${formatDate(doc.due_date)}` : ""}
          </p>
          {doc.accepted_at && isQuote && (
            <p className="mt-1 text-xs text-success">
              Accepted {formatDate(doc.accepted_at)}
              {doc.accepted_by_name ? ` by ${doc.accepted_by_name} in the client portal` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${here}/edit`} className={BUTTON}>
            Edit
          </Link>
          <Link href={`/admin/print/billing/${doc.id}`} className={BUTTON}>
            Print / PDF
          </Link>
          <form action={duplicateDocument}>
            <input type="hidden" name="__id" value={doc.id} />
            <button type="submit" className={BUTTON}>
              Duplicate
            </button>
          </form>
          {isAdmin && (
            <form action={deleteDocument}>
              <input type="hidden" name="__id" value={doc.id} />
              <ConfirmSubmit message="Delete this document and its payments? This cannot be undone." className={`${BUTTON} text-error`} />
            </form>
          )}
        </div>
      </div>

      <Flash success={success} error={errorText(searchParams.error)} />

      {/* Next-step strip: the one thing most likely to happen next. */}
      <section className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4">
        <p className="mr-auto text-sm text-text-primary/80">
          {doc.status === "draft" && "Draft — only the team can see it. Send it when it's ready."}
          {isQuote && doc.status === "sent" && "Waiting for the client. They can accept it in their portal, or you can mark it accepted."}
          {isQuote && doc.status === "accepted" && "Accepted. Raise the advance or full invoice below."}
          {!isQuote && ["sent", "partially_paid"].includes(doc.status) && status !== "overdue" && `Awaiting payment of ${formatMoney(balance, doc.currency)}.`}
          {status === "overdue" && `Overdue — ${formatMoney(balance, doc.currency)} outstanding since ${formatDate(doc.due_date)}.`}
          {doc.status === "paid" && "Paid in full. Print it again for a paid copy, or send receipts below."}
          {doc.status === "cancelled" && "Cancelled. It no longer counts toward receivables."}
        </p>
        {doc.status === "draft" && (
          <StatusButton id={doc.id} status="sent" label={isQuote ? "Mark as sent" : "Issue invoice"} primary />
        )}
        {isQuote && doc.status === "sent" && <StatusButton id={doc.id} status="accepted" label="Mark accepted" primary />}
        {doc.status !== "cancelled" && doc.status !== "paid" && <StatusButton id={doc.id} status="cancelled" label="Cancel" />}
        {doc.status === "cancelled" && <StatusButton id={doc.id} status="draft" label="Restore as draft" />}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {isQuote && doc.status !== "cancelled" && (
            <section className="rounded-card border border-border bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-ink-900">Bill this quote</h2>
                <p className="text-sm text-text-primary/70">
                  {formatMoney(invoicedFromQuote, doc.currency)} of {formatMoney(total, doc.currency)} invoiced
                </p>
              </div>
              <ConvertQuoteForm
                quoteId={doc.id}
                total={total}
                invoiced={invoicedFromQuote}
                currency={doc.currency}
                defaultPercent={Number(advanceSetting) || 40}
                hasRecurring={hasRecurring}
              />
            </section>
          )}

          {!isQuote && (
            <section className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Payments</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-text-primary/60">Invoice total</p>
                  <p className="font-semibold text-ink-900">{formatMoney(total, doc.currency)}</p>
                </div>
                <div>
                  <p className="text-text-primary/60">Received</p>
                  <p className="font-semibold text-success">{formatMoney(paid, doc.currency)}</p>
                </div>
                <div>
                  <p className="text-text-primary/60">Balance due</p>
                  <p className={`font-semibold ${balance > 0 ? "text-ink-900" : "text-success"}`}>
                    {formatMoney(Math.max(0, balance), doc.currency)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas-warm" aria-hidden="true">
                <div className="h-full bg-success" style={{ width: `${paidPercent}%` }} />
              </div>

              {payments.length > 0 && (
                <ul className="mt-5 divide-y divide-border rounded-card border border-border">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-ink-900">{formatMoney(Number(payment.amount), doc.currency)}</p>
                        <p className="text-xs text-text-primary/60">
                          {formatDate(payment.paid_on)} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                          {payment.reference ? ` · Ref ${payment.reference}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/print/receipt/${payment.id}`} className="text-brand-700 underline">
                          Receipt
                        </Link>
                        {isAdmin && (
                          <form action={deletePayment}>
                            <input type="hidden" name="payment_id" value={payment.id} />
                            <input type="hidden" name="redirect_to" value={here} />
                            <ConfirmSubmit message="Remove this payment? The invoice balance will go back up." label="Remove" />
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {balance > 0 && doc.status !== "cancelled" && (
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  <form action={recordPayment}>
                    <input type="hidden" name="document_id" value={doc.id} />
                    <input type="hidden" name="full_balance" value="on" />
                    <input type="hidden" name="method" value="bank_transfer" />
                    <SubmitButton pendingLabel="Recording...">
                      Mark fully paid today ({formatMoney(balance, doc.currency)})
                    </SubmitButton>
                  </form>

                  <details className="rounded-card border border-border p-4">
                    <summary className="cursor-pointer text-sm font-medium text-ink-900">Record a part payment</summary>
                    <form action={recordPayment} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="document_id" value={doc.id} />
                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-ink-900">
                          Amount received
                        </label>
                        <input id="amount" name="amount" type="number" step="0.01" min="0.01" max={balance} defaultValue={balance} required className={FIELD} />
                      </div>
                      <div>
                        <label htmlFor="paid_on" className="block text-sm font-medium text-ink-900">
                          Date received
                        </label>
                        <input id="paid_on" name="paid_on" type="date" defaultValue={todayIso()} className={FIELD} />
                      </div>
                      <div>
                        <label htmlFor="method" className="block text-sm font-medium text-ink-900">
                          Method
                        </label>
                        <select id="method" name="method" defaultValue="bank_transfer" className={FIELD}>
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="reference" className="block text-sm font-medium text-ink-900">
                          Reference / UTR
                        </label>
                        <input id="reference" name="reference" className={FIELD} />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-ink-900">
                          Note
                        </label>
                        <input id="notes" name="notes" className={FIELD} />
                      </div>
                      <div className="sm:col-span-2">
                        <SubmitButton pendingLabel="Recording...">Record payment</SubmitButton>
                      </div>
                    </form>
                  </details>
                </div>
              )}
            </section>
          )}

          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">Line items</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="border-b border-border text-text-primary/60">
                <tr>
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 text-right font-medium">Qty</th>
                  <th className="py-2 pr-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-border last:border-0 align-top">
                    <td className="py-2 pr-2">
                      <span className="text-ink-900">{item.name}</span>
                      <span className="block text-xs text-text-primary/60">
                        {item.category}
                        {item.recurring !== "one_time" ? ` · ${item.recurring}` : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right">{item.quantity}</td>
                    <td className="py-2 pr-2 text-right">{formatMoney(item.unit_price, doc.currency)}</td>
                    <td className="py-2 text-right">{formatMoney(item.line_total, doc.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-text-primary/60">Subtotal</dt><dd>{formatMoney(Number(doc.subtotal), doc.currency)}</dd></div>
              {Number(doc.discount_amount) > 0 && (
                <div className="flex justify-between"><dt className="text-text-primary/60">Discount</dt><dd>−{formatMoney(Number(doc.discount_amount), doc.currency)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-text-primary/60">Tax</dt><dd>{formatMoney(Number(doc.tax_amount), doc.currency)}</dd></div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold text-ink-900"><dt>Total</dt><dd>{formatMoney(total, doc.currency)}</dd></div>
              {recurring.map((entry) => (
                <div key={entry.cycle} className="flex justify-between text-text-primary/70">
                  <dt>{entry.label}</dt>
                  <dd>{formatMoney(entry.amount, doc.currency)}{entry.suffix}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          {(source || linked.length > 0) && (
            <section className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">Project billing</h2>
              {source && (
                <p className="mt-2 text-sm text-text-primary/70">
                  From quotation{" "}
                  <Link href={`/admin/billing/${source.id}`} className="text-brand-700 underline">
                    {source.number}
                  </Link>{" "}
                  · project value {formatMoney(Number(source.total), source.currency)}
                </p>
              )}
              {linked.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {linked.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/admin/billing/${entry.id}`}
                        className={`flex items-center justify-between gap-3 rounded-card border px-3 py-2 text-sm hover:border-brand-700 ${
                          entry.id === doc.id ? "border-brand-700 bg-brand-700/5" : "border-border"
                        }`}
                      >
                        <span>
                          <span className="font-medium text-ink-900">{entry.number}</span>
                          <span className="block text-xs text-text-primary/60">
                            {INVOICE_KIND_LABELS[entry.invoice_kind ?? "standard"]} · {formatDate(entry.issue_date)}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-ink-900">{formatMoney(Number(entry.total), doc.currency)}</span>
                          <StatusBadge status={effectiveStatus(entry)} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {source && (
                <p className="mt-4 text-xs text-text-primary/60">
                  {formatMoney(Math.max(0, Number(source.total) - invoicedFromQuote), source.currency)} of the project
                  value is still to be invoiced.
                </p>
              )}
            </section>
          )}

          <section className="rounded-card border border-border bg-surface p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-ink-900">Client</h2>
            <p className="mt-2 text-ink-900">{doc.client_name}</p>
            {doc.client_email && <p className="text-text-primary/70">{doc.client_email}</p>}
            {doc.client_id ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/admin/clients/${doc.client_id}/account`} className="text-brand-700 underline">
                  Client account
                </Link>
                <Link href={`/admin/billing/new?type=${isQuote ? "quote" : "invoice"}&client=${doc.client_id}`} className="text-brand-700 underline">
                  New {isQuote ? "quote" : "invoice"} for this client
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-xs text-text-primary/60">Not linked to a client account. Edit the document to link one.</p>
            )}
            {doc.notes && <p className="mt-4 whitespace-pre-line text-text-primary/70">{doc.notes}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusButton({ id, status, label, primary = false }: { id: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setDocumentStatus}>
      <input type="hidden" name="__id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={
          primary
            ? "rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
            : BUTTON
        }
      >
        {label}
      </button>
    </form>
  );
}
