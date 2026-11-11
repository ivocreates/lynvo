import Image from "next/image";
import { PAYMENT_METHOD_LABELS, formatMoney, type BillingSettings } from "@/lib/admin/billing";
import logoMark from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";

export type ReceiptData = {
  id: string;
  amount: number;
  tds_amount?: number;
  currency: string;
  paid_on: string;
  method: string;
  reference: string | null;
  invoice: { number: string; total: number; amount_paid: number; balance_due: number; client_name: string; client_address: string | null };
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Short reference derived from the payment id; stable and unique enough to quote. */
export function receiptNumber(id: string, paidOn: string) {
  return `RCPT/${paidOn.slice(0, 4)}/${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function PaymentReceipt({ receipt, settings }: { receipt: ReceiptData; settings: BillingSettings }) {
  const balance = Math.max(0, Number(receipt.invoice.balance_due));

  return (
    <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-ink-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-900 pb-5">
        <div>
          {settings.billing_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.billing_logo_url} alt={settings.billing_legal_name || "Logo"} className="mb-2 h-12 w-auto object-contain" />
          ) : (
            <Image src={logoMark} alt="LYNVO" height={48} className="mb-2 h-12 w-auto object-contain" />
          )}
          <p className="font-display text-base font-semibold">{settings.billing_legal_name || "LYNVO CREATIVE SOLUTIONS LLP"}</p>
          {settings.billing_registered_address && (
            <p className="mt-1 whitespace-pre-line text-[12px] text-ink-900/70">{settings.billing_registered_address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-semibold tracking-wide">PAYMENT RECEIPT</p>
          <p className="mt-2 text-[12px]">
            <span className="text-ink-900/60">Receipt:</span> {receiptNumber(receipt.id, receipt.paid_on)}
          </p>
          <p className="text-[12px]">
            <span className="text-ink-900/60">Date:</span> {formatDate(receipt.paid_on)}
          </p>
        </div>
      </header>

      <section className="mt-8 space-y-4">
        <p>
          Received with thanks from <span className="font-semibold">{receipt.invoice.client_name}</span> the sum of{" "}
          <span className="font-semibold">{formatMoney(Number(receipt.amount), receipt.currency)}</span> by{" "}
          {PAYMENT_METHOD_LABELS[receipt.method] ?? receipt.method}
          {receipt.reference ? ` (reference ${receipt.reference})` : ""} towards invoice{" "}
          <span className="font-semibold">{receipt.invoice.number}</span>.
        </p>

        <dl className="ml-auto mt-6 w-full max-w-sm space-y-1 text-[12px]">
          <div className="flex justify-between">
            <dt className="text-ink-900/65">Invoice total</dt>
            <dd>{formatMoney(Number(receipt.invoice.total), receipt.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-900/65">This payment</dt>
            <dd>{formatMoney(Number(receipt.amount), receipt.currency)}</dd>
          </div>
          {Number(receipt.tds_amount ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-900/65">TDS deducted by client</dt>
              <dd>{formatMoney(Number(receipt.tds_amount), receipt.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-900/65">Total paid to date</dt>
            <dd>{formatMoney(Number(receipt.invoice.amount_paid), receipt.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink-900/30 pt-1 text-[14px] font-semibold">
            <dt>Balance due</dt>
            <dd>{balance > 0 ? formatMoney(balance, receipt.currency) : "Nil — paid in full"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12 flex flex-wrap items-end justify-between gap-8 text-[12px]">
        <div>
          {settings.billing_signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.billing_signature_url} alt="Signature" className="h-14 w-auto object-contain" />
          ) : (
            <div className="h-12" />
          )}
          <p className="w-56 border-t border-ink-900/40 pt-1 font-semibold">{settings.doc_signatory_name || "Authorized signatory"}</p>
          <p className="text-ink-900/70">{settings.billing_legal_name}</p>
        </div>
        {settings.billing_stamp_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.billing_stamp_url} alt="Company stamp" className="h-20 w-auto object-contain" />
        )}
      </section>

      <footer className="mt-12 border-t-2 border-ink-900 pt-3 text-center text-[11px] text-ink-900/70">
        <p className="whitespace-pre-line">
          {settings.billing_receipt_note || "Thank you for your payment. This receipt is computer generated and valid without a signature."}
        </p>
        <p className="mt-1">{[settings.billing_legal_name, settings.billing_website].filter(Boolean).join("  ·  ")}</p>
      </footer>
    </article>
  );
}
