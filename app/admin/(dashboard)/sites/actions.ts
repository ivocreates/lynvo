"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, recordAudit } from "@/lib/auth";
import { SITE_COPY_KEYS } from "@/lib/admin/settings";

export type SiteCopyState = { ok: boolean; message: string };

export async function saveSiteCopy(_prev: SiteCopyState, formData: FormData): Promise<SiteCopyState> {
  await requirePermission("website");

  const supabase = createClient();
  const rows = SITE_COPY_KEYS.map((key) => ({
    key,
    value: { text: String(formData.get(key) ?? "").trim().slice(0, 2000) },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, message: "Could not save the site copy." };

  await recordAudit("update", "site_settings", null, { scope: "site_copy" });
  revalidatePath("/");
  revalidatePath("/tech", "layout");
  revalidatePath("/admin/sites");
  return { ok: true, message: "Saved. Both sites are updated." };
}
