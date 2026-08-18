"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, requireManager, recordAudit } from "@/lib/auth";
import { EMPLOYMENT_TYPES, isRole } from "@/lib/roles";
import { getSiteUrl } from "@/lib/env";

export type AdminsState = { ok: boolean; message: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const detailsSchema = z.object({
  display_name: optional(120),
  title: optional(120),
  department: optional(120),
  phone: optional(40),
  employment_type: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value && (EMPLOYMENT_TYPES as readonly string[]).includes(value) ? value : null
    ),
  joined_on: optional(10),
  ends_on: optional(10),
  manager_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null)),
});

export async function updateStaffAccess(formData: FormData) {
  const actor = await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const isActive = formData.get("is_active") === "on";

  if (!id || !isRole(role)) return;
  // Guard against demoting yourself out of the only super admin account.
  if (id === actor.id && (role !== "super_admin" || !isActive)) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, is_active: isActive })
    .eq("id", id);

  if (!error) await recordAudit("role_change", "profiles", id, { role, is_active: isActive });

  revalidatePath("/admin/admins");
}

export async function updateStaffDetails(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = detailsSchema.safeParse({
    display_name: formData.get("display_name") ?? undefined,
    title: formData.get("title") ?? undefined,
    department: formData.get("department") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    employment_type: formData.get("employment_type") ?? undefined,
    joined_on: formData.get("joined_on") ?? undefined,
    ends_on: formData.get("ends_on") ?? undefined,
    manager_id: formData.get("manager_id") ?? undefined,
  });

  if (!parsed.success) return;

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", id);

  if (!error) await recordAudit("update", "profiles", id, { fields: Object.keys(parsed.data) });

  revalidatePath("/admin/admins");
  revalidatePath("/staff");
}

export async function inviteStaff(_prev: AdminsState, formData: FormData): Promise<AdminsState> {
  await requireSuperAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "employee");
  const employmentType = String(formData.get("employment_type") ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!isRole(role)) {
    return { ok: false, message: "Choose a valid role." };
  }

  const admin = createAdminClient();
  const redirectTo = `${getSiteUrl()}/auth/confirm?next=/admin/update-password`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error || !data.user) {
    return { ok: false, message: "Could not send the invite. The address may already be registered." };
  }

  // The signup trigger creates an inactive editor profile; apply the chosen access.
  await admin
    .from("profiles")
    .update({
      role,
      is_active: true,
      employment_type: (EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)
        ? employmentType
        : null,
    })
    .eq("id", data.user.id);
  await recordAudit("invite", "profiles", data.user.id, { email, role });

  revalidatePath("/admin/admins");
  return { ok: true, message: `Invite sent to ${email}.` };
}
