"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, recordAudit } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";

export type AdminsState = { ok: boolean; message: string };

const ROLES = ["editor", "admin", "super_admin"] as const;

export async function updateStaffAccess(formData: FormData) {
  const actor = await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const isActive = formData.get("is_active") === "on";

  if (!id || !ROLES.includes(role as (typeof ROLES)[number])) return;
  if (id === actor.id && (role !== "super_admin" || !isActive)) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, is_active: isActive })
    .eq("id", id);

  if (!error) await recordAudit("role_change", "profiles", id, { role, is_active: isActive });

  revalidatePath("/admin/admins");
}

export async function inviteStaff(_prev: AdminsState, formData: FormData): Promise<AdminsState> {
  await requireSuperAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return { ok: false, message: "Choose a valid role." };
  }

  const admin = createAdminClient();
  const redirectTo = `${getSiteUrl()}/auth/confirm?next=/admin/update-password`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error || !data.user) {
    return { ok: false, message: "Could not send the invite. The address may already be registered." };
  }

  // The signup trigger creates an inactive editor profile; apply the chosen access.
  await admin.from("profiles").update({ role, is_active: true }).eq("id", data.user.id);
  await recordAudit("invite", "profiles", data.user.id, { email, role });

  revalidatePath("/admin/admins");
  return { ok: true, message: `Invite sent to ${email}.` };
}
