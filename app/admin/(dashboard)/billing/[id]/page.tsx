import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { getCatalog } from "@/lib/admin/catalog";
import type { LineItem } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import BillingForm, { type DocumentRecord } from "@/components/admin/billing-form";

export default async function EditBillingDocumentPage({ params }: { params: { id: string } }) {
  await requireStaff();

  const supabase = createClient();
  const { data: document } = await supabase
    .from("billing_documents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!document) notFound();

  const record = document as unknown as DocumentRecord;

  const [{ data: itemRows }, catalog, settings] = await Promise.all([
    supabase
      .from("billing_document_items")
      .select("name, description, category, recurring, unit, hsn_sac, quantity, unit_price, tax_rate, line_total")
      .eq("document_id", params.id)
      .order("position", { ascending: true }),
    getCatalog(),
    getBillingSettings(),
  ]);

  const items = ((itemRows ?? []) as LineItem[]).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: Number(item.tax_rate),
  }));

  const label = record.doc_type === "invoice" ? "invoice" : "quote";

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title={`Edit ${label} ${record.number}`}
        description={record.client_name}
      />
      <Link href={`/admin/print/billing/${record.id}`} className="mb-6 inline-block text-sm text-brand-700 underline">
        Open print view
      </Link>
      <BillingForm
        docType={record.doc_type}
        document={{ ...record, discount_amount: Number(record.discount_amount) }}
        items={items}
        presets={catalog.presets}
        packages={catalog.packages}
        defaults={{
          currency: settings.billing_currency || "INR",
          terms: record.doc_type === "invoice" ? settings.billing_invoice_terms : settings.billing_quote_terms,
        }}
      />
    </div>
  );
}
