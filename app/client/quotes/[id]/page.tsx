import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import type { LineItem } from "@/lib/admin/billing";
import PrintButton from "@/components/admin/print-button";
import BillingDocument, { type BillingDocumentRecord } from "@/components/documents/billing-document";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientQuotePage({ params }: { params: { id: string } }) {
  const profile = await requireClient();

  const supabase = createClient();
  const { data: document } = await supabase
    .from("billing_documents")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", profile.client_id)
    .maybeSingle();

  if (!document) notFound();

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

  return (
    <div>
      <style>{"@page { size: A4; margin: 14mm; }"}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href="/client/quotes" className="text-sm text-brand-700 underline">
          Back to quotes &amp; invoices
        </Link>
        <PrintButton />
      </div>

      <BillingDocument
        doc={document as unknown as BillingDocumentRecord}
        items={items}
        settings={settings}
      />
    </div>
  );
}
