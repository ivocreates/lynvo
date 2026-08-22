import { requireStaff } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { getCatalog, getClientOptions } from "@/lib/admin/catalog";
import type { DocType } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import BillingForm from "@/components/admin/billing-form";

export default async function NewBillingDocumentPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  await requireStaff();

  const docType: DocType = searchParams.type === "invoice" ? "invoice" : "quote";
  const [settings, catalog, clients] = await Promise.all([
    getBillingSettings(),
    getCatalog(),
    getClientOptions(),
  ]);

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
        presets={catalog.presets}
        packages={catalog.packages}
        clients={clients}
        defaults={{
          currency: settings.billing_currency || "INR",
          terms: docType === "invoice" ? settings.billing_invoice_terms : settings.billing_quote_terms,
        }}
      />
    </div>
  );
}
