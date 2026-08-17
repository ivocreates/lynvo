import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import type { DocType } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import BillingForm, { type PresetItem } from "@/components/admin/billing-form";

export default async function NewBillingDocumentPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  await requireStaff();

  const docType: DocType = searchParams.type === "invoice" ? "invoice" : "quote";
  const settings = await getBillingSettings();

  const supabase = createClient();
  const { data } = await supabase
    .from("billing_items")
    .select("id, name, description, unit, unit_price, tax_rate, hsn_sac")
    .eq("active", true)
    .order("order", { ascending: true });

  const label = docType === "invoice" ? "invoice" : "quote";

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title={`New ${label}`}
        description={`Letterhead and footer come from your billing settings.`}
      />
      <BillingForm
        docType={docType}
        presets={(data ?? []) as PresetItem[]}
        defaults={{
          currency: settings.billing_currency || "INR",
          terms: docType === "invoice" ? settings.billing_invoice_terms : settings.billing_quote_terms,
        }}
      />
    </div>
  );
}
