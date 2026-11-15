import "server-only";

import { createClient } from "@/lib/db/server";
import { PRINT_SETTING_KEYS, type BillingSettings } from "@/lib/admin/billing";

export async function getBillingSettings(): Promise<BillingSettings> {
  const db = createClient();
  const { data } = await db
    .from("site_settings")
    .select("key, value")
    .in("key", PRINT_SETTING_KEYS);

  const settings: BillingSettings = {};
  for (const key of PRINT_SETTING_KEYS) settings[key] = "";

  for (const row of (data ?? []) as { key: string; value: { text?: string } | null }[]) {
    settings[row.key] = row.value?.text ?? "";
  }

  return settings;
}
