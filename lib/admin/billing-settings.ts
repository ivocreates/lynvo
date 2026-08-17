import "server-only";

import { createClient } from "@/lib/supabase/server";
import { BILLING_SETTING_KEYS, type BillingSettings } from "@/lib/admin/billing";

export async function getBillingSettings(): Promise<BillingSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", BILLING_SETTING_KEYS);

  const settings: BillingSettings = {};
  for (const key of BILLING_SETTING_KEYS) settings[key] = "";

  for (const row of (data ?? []) as { key: string; value: { text?: string } | null }[]) {
    settings[row.key] = row.value?.text ?? "";
  }

  return settings;
}
