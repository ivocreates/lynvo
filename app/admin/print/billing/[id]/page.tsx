import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import {
  formatMoney,
  groupByCategory,
  recurringSuffix,
  recurringTotals,
  type LineItem,
} from "@/lib/admin/billing";
import PrintButton from "@/components/admin/print-button";
import logoMark from "@/assets/logo/Horizontal Logo/Light/Horizontal Logo Light Mode.png";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type DocumentRow = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_gstin: string | null;
  currency: string;
  discount_amount: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BillingPrintPage({ params }: { params: { id: string } }) {
  await requireStaff();

  const supabase = createClient();
  const { data: document } = await supabase
    .from("billing_documents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!document) notFound();

  const doc = document as unknown as DocumentRow;

  const [{ data: itemRows }, settings] = await Promise.all([
    supabase
      .from("billing_document_items")
      .select("name, description, category, recurring, unit, hsn_sac, quantity, unit_price, tax_rate, line_total")
      .eq("document_id", params.id)
      .order("position", { ascending: true }),
    getBillingSettings(),
  ]);

  const items = ((itemRows ?? []) as LineItem[]).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: Number(item.tax_rate),
    line_total: Number(item.line_total),
  }));

  const currency = doc.currency || "INR";
  const isInvoice = doc.doc_type === "invoice";
  const title = isInvoice ? "TAX INVOICE" : "PROJECT PROPOSAL & QUOTATION";
  const groups = groupByCategory(items);
  const recurring = recurringTotals(items);

  const identifiers = [
    settings.billing_llpin && `LLPIN: ${settings.billing_llpin}`,
    settings.billing_gstin && `GSTIN: ${settings.billing_gstin}`,
    settings.billing_pan && `PAN: ${settings.billing_pan}`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>

      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link href="/admin/billing" className="text-sm text-brand-700 underline">
          Back to billing
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-ink-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-900 pb-5">
          <div>
            {settings.billing_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.billing_logo_url}
                alt={settings.billing_legal_name || "Logo"}
                className="mb-2 h-12 w-auto object-contain"
              />
            ) : (
              <Image
                src={logoMark}
                alt={settings.billing_legal_name || "LYNVO"}
                height={48}
                priority
                className="mb-2 h-12 w-auto object-contain"
              />
            )}
            <p className="font-display text-base font-semibold">
              {settings.billing_legal_name || "LYNVO CREATIVE SOLUTIONS LLP"}
            </p>
            {settings.billing_registered_address && (
              <p className="mt-1 whitespace-pre-line text-[12px] text-ink-900/70">
                {settings.billing_registered_address}
              </p>
            )}
            <p className="mt-1 text-[12px] text-ink-900/70">
              {[settings.billing_email, settings.billing_phone, settings.billing_website]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            {identifiers.length > 0 && (
              <p className="mt-1 text-[12px] text-ink-900/70">{identifiers.join("  ·  ")}</p>
            )}
          </div>

          <div className="text-right">
            <p className="font-display text-lg font-semibold tracking-wide">{title}</p>
            <p className="mt-2 text-[12px]">
              <span className="text-ink-900/60">Number:</span> {doc.number}
            </p>
            <p className="text-[12px]">
              <span className="text-ink-900/60">Date:</span> {formatDate(doc.issue_date)}
            </p>
            {doc.due_date && (
              <p className="text-[12px]">
                <span className="text-ink-900/60">{isInvoice ? "Due:" : "Valid until:"}</span>{" "}
                {formatDate(doc.due_date)}
              </p>
            )}
            <p className="text-[12px] capitalize">
              <span className="text-ink-900/60">Status:</span> {doc.status}
            </p>
          </div>
        </header>

        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">
            {isInvoice ? "Bill to" : "Prepared for"}
          </p>
          <p className="mt-1 font-semibold">{doc.client_name}</p>
          {doc.client_address && (
            <p className="whitespace-pre-line text-[12px] text-ink-900/75">{doc.client_address}</p>
          )}
          <p className="text-[12px] text-ink-900/75">
            {[doc.client_email, doc.client_phone].filter(Boolean).join("  ·  ")}
          </p>
          {doc.client_gstin && <p className="text-[12px] text-ink-900/75">GSTIN: {doc.client_gstin}</p>}
        </section>

        <table className="mt-6 w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-y border-ink-900/20 bg-ink-900/[0.04]">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Service</th>
              <th className="py-2 pr-2 text-right font-semibold">Qty</th>
              <th className="py-2 pr-2 text-right font-semibold">Rate</th>
              <th className="py-2 pr-2 text-right font-semibold">Tax</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.category}>
                <tr className="border-b border-ink-900/10">
                  <td
                    colSpan={6}
                    className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-brand-700"
                  >
                    {group.category}
                  </td>
                </tr>
                {group.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-ink-900/10 align-top">
                    <td className="py-2 pr-2">{index + 1}</td>
                    <td className="py-2 pr-2">
                      <span className="font-medium">{item.name}</span>
                      {item.description && (
                        <span className="block whitespace-pre-line text-ink-900/65">{item.description}</span>
                      )}
                      {item.hsn_sac && (
                        <span className="block text-[11px] text-ink-900/50">HSN/SAC: {item.hsn_sac}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {item.quantity} {item.unit ?? ""}
                    </td>
                    <td className="py-2 pr-2 text-right">{formatMoney(item.unit_price, currency)}</td>
                    <td className="py-2 pr-2 text-right">{item.tax_rate}%</td>
                    <td className="py-2 text-right">
                      {formatMoney(item.line_total, currency)}
                      <span className="text-ink-900/60">{recurringSuffix(item.recurring)}</span>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <dl className="w-72 space-y-1 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-900/65">{isInvoice ? "Subtotal" : "Development subtotal"}</dt>
              <dd>{formatMoney(Number(doc.subtotal), currency)}</dd>
            </div>
            {Number(doc.discount_amount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-900/65">Discount</dt>
                <dd>−{formatMoney(Number(doc.discount_amount), currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-900/65">GST / applicable tax</dt>
              <dd>{formatMoney(Number(doc.tax_amount), currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-900/30 pt-1 text-[14px] font-semibold">
              <dt>{isInvoice ? "Total" : "Total project investment"}</dt>
              <dd>{formatMoney(Number(doc.total), currency)}</dd>
            </div>
            {recurring.map((entry) => (
              <div key={entry.cycle} className="flex justify-between pt-1">
                <dt className="text-ink-900/65">{entry.label} services</dt>
                <dd>
                  {formatMoney(entry.amount, currency)}
                  {entry.suffix}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <section className="mt-8 space-y-4 border-t border-ink-900/15 pt-5 text-[12px]">
          {settings.billing_bank_details && isInvoice && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">
                Payment details
              </p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{settings.billing_bank_details}</p>
            </div>
          )}
          {!isInvoice && settings.billing_payment_terms && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">
                Payment terms
              </p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{settings.billing_payment_terms}</p>
            </div>
          )}
          {doc.notes && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">Notes</p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{doc.notes}</p>
            </div>
          )}
          {doc.terms && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">Terms</p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{doc.terms}</p>
            </div>
          )}
          {!isInvoice && settings.billing_support_policy && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">
                Post-delivery support
              </p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{settings.billing_support_policy}</p>
            </div>
          )}
          {settings.billing_third_party_note && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">
                Third-party services
              </p>
              <p className="mt-1 whitespace-pre-line text-ink-900/80">{settings.billing_third_party_note}</p>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t-2 border-ink-900 pt-3 text-center text-[11px] text-ink-900/70">
          <p className="whitespace-pre-line">{settings.billing_footer_legal}</p>
          {settings.billing_tagline && (
            <p className="mt-1 font-display text-[12px] text-ink-900">{settings.billing_tagline}</p>
          )}
          <p className="mt-1">
            {[settings.billing_legal_name, settings.billing_website].filter(Boolean).join("  ·  ")}
          </p>
        </footer>
      </article>
    </div>
  );
}
