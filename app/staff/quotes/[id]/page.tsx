import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { getCatalog } from "@/lib/admin/catalog";
import BillingForm from "@/components/admin/billing-form";
import type { LineItem } from "@/lib/admin/billing";
import { saveStaffQuote } from "../actions";

export default async function EditStaffQuotePage({ params }: { params: { id: string } }) {
  const profile = await requirePermission("billing.draft");

  const supabase = createClient();
  const { data: document } = await supabase
    .from("billing_documents")
    .select("*")
    .eq("id", params.id)
    .eq("created_by", profile.id)
    .eq("status", "draft")
    .maybeSingle();

  if (!document) notFound();

  const [{ data: itemRows }, catalog, settings] = await Promise.all([
    supabase
      .from("billing_document_items")
      .select("name, description, category, recurring, unit, hsn_sac, quantity, unit_price, tax_rate, line_total")
      .eq("document_id", params.id)
      .order("position", { ascending: true }),
    getCatalog(),
    getBillingSettings(),
  ]);

  return (
    <div>
      <p className="section-stamp">SALES</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Edit quote</h1>

      <div className="mt-8">
        <BillingForm
          cancelHref="/staff/quotes"
          docType="quote"
          document={document as any}
          items={(itemRows ?? []) as LineItem[]}
          presets={catalog.presets}
          packages={catalog.packages}
        offers={catalog.offers}
          defaults={{
            currency: settings.billing_currency || "INR",
            terms: settings.billing_quote_terms,
          }}
          action={saveStaffQuote}
          canSetStatus={false}
        />
      </div>
    </div>
  );
}
