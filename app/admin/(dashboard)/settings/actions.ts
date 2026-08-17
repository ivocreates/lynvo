"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, recordAudit } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/admin/settings";

export type SettingsState = { ok: boolean; message: string };

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const supabase = createClient();
  const rows = SETTING_KEYS.map((setting) => ({
    key: setting.key,
    value: { text: String(formData.get(setting.key) ?? "").trim() },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    return { ok: false, message: "Could not save settings." };
  }

  await recordAudit("update", "site_settings", null, { keys: rows.length });
  revalidatePath("/admin/settings");
  revalidatePath("/");

  return { ok: true, message: "Settings saved." };
}
