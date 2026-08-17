"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSuperAdmin, recordAudit } from "@/lib/auth";

const STATUSES = ["new", "read", "replied", "archived"] as const;

export async function updateContactStatus(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (!error) await recordAudit("status_change", "contacts", id, { status });

  revalidatePath("/admin/contacts");
}

export async function deleteContact(formData: FormData) {
  await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (!error) await recordAudit("delete", "contacts", id);

  revalidatePath("/admin/contacts");
}
