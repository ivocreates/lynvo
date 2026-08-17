import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";
import SettingsForm from "@/components/admin/settings-form";

export default async function SettingsPage() {
  await requireAdmin();

  const supabase = createClient();
  const { data: rows } = await supabase.from("site_settings").select("key, value");

  const values: Record<string, string> = {};
  for (const row of (rows ?? []) as { key: string; value: { text?: string } | null }[]) {
    values[row.key] = row.value?.text ?? "";
  }

  return (
    <div>
      <PageHeader
        stamp="CONFIGURATION"
        title="Site settings"
        description="Identity and contact details used across the public site."
      />
      <SettingsForm values={values} />
    </div>
  );
}
