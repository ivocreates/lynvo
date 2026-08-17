import { requireAdmin } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PageHeader from "@/components/admin/page-header";
import BillingSettingsForm from "@/components/admin/billing-settings-form";

export default async function BillingSettingsPage() {
  await requireAdmin();

  const values = await getBillingSettings();

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title="Letterhead & footer"
        description="LYNVO identity, statutory details and defaults printed on every quote and invoice."
      />
      <BillingSettingsForm values={values} />
    </div>
  );
}
