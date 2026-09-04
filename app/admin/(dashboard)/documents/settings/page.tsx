import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { HR_DOCUMENT_SETTING_GROUPS } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import BillingSettingsForm from "@/components/admin/billing-settings-form";
import { saveDocumentSettings } from "../actions";

export default async function DocumentSettingsPage() {
  await requireManager();

  const settings = await getBillingSettings();

  return (
    <div>
      <PageHeader
        stamp="FORMAT"
        title="Document formatting"
        description="HR document footer text, stamp, and first/second designated partner signatures."
      />

      <Link href="/admin/documents" className="mb-6 inline-block text-sm text-brand-700 underline">
        Back to document management
      </Link>

      <BillingSettingsForm
        values={settings}
        groups={HR_DOCUMENT_SETTING_GROUPS}
        action={saveDocumentSettings}
        submitLabel="Save document formatting"
      />
    </div>
  );
}
