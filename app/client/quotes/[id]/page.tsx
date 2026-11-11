import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { loadBillingView } from "@/lib/billing-view";
import { formatMoney } from "@/lib/admin/billing";
import PrintButton from "@/components/admin/print-button";
import SubmitButton from "@/components/admin/submit-button";
import BillingDocument from "@/components/documents/billing-document";
import { receiptNumber } from "@/components/documents/payment-receipt";
import { acceptQuote } from "../../actions";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientQuotePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { accepted?: string; error?: string };
}) {
  const profile = await requireClient();

  const [view, settings] = await Promise.all([
    loadBillingView(params.id, { clientId: profile.client_id }),
    getBillingSettings(),
  ]);
  if (!view) notFound();

  const { doc } = view;
  const isQuote = doc.doc_type === "quote";

  const { data: paymentRows } = isQuote
    ? { data: [] }
    : await createClient()
        .from("billing_payments")
        .select("id, amount, currency, paid_on")
        .eq("document_id", params.id)
        .order("paid_on");
  const payments = (paymentRows ?? []) as { id: string; amount: number; currency: string; paid_on: string }[];

  return (
    <div>
      <style>{"@page { size: A4; margin: 14mm; }"}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href="/client/quotes" className="text-sm text-brand-700 underline">
          Back to your account
        </Link>
        <PrintButton />
      </div>

      {searchParams.accepted && (
        <p className="mb-6 rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success print:hidden">
          Thank you — the quotation is accepted. We&apos;ll send the advance invoice shortly.
        </p>
      )}
      {searchParams.error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error print:hidden">
          {searchParams.error === "confirm"
            ? "Type your full name and tick the box to accept."
            : "We could not record your acceptance. It may already be accepted or expired."}
        </p>
      )}

      {isQuote && doc.status === "sent" && (
        <form action={acceptQuote} className="mb-6 rounded-card border border-brand-700/40 bg-surface p-5 print:hidden">
          <input type="hidden" name="id" value={params.id} />
          <h2 className="font-display text-lg font-semibold text-ink-900">Accept this quotation</h2>
          <p className="mt-1 text-sm text-text-primary/75">
            Accepting confirms the scope and total of {formatMoney(Number(doc.total), doc.currency)} and the payment terms
            below. Your name, the date and time are recorded.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor="signer" className="block text-sm font-medium text-ink-900">
                Your full name
              </label>
              <input
                id="signer"
                name="signer"
                required
                minLength={2}
                defaultValue={profile.display_name ?? ""}
                className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink-900">
              <input type="checkbox" name="agree" required className="h-4 w-4 accent-brand-700" />
              I accept on behalf of my company
            </label>
            <SubmitButton pendingLabel="Accepting...">Accept quotation</SubmitButton>
          </div>
        </form>
      )}

      {payments.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3 text-sm print:hidden">
          {payments.map((payment) => (
            <Link key={payment.id} href={`/client/receipts/${payment.id}`} className="rounded-card border border-border bg-surface px-3 py-1.5 text-brand-700 hover:border-brand-700">
              Receipt {receiptNumber(payment.id, payment.paid_on)} · {formatMoney(Number(payment.amount), payment.currency)}
            </Link>
          ))}
        </div>
      )}

      <BillingDocument doc={doc} items={view.items} settings={settings} payments={view.payments} project={view.project} />
    </div>
  );
}
