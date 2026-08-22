"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, requireManager, requireAdmin, recordAudit } from "@/lib/auth";
import { EMPLOYMENT_TYPES, isRole, ROLE_LABELS, ROLE_RANK } from "@/lib/roles";
import { provisionAccount } from "@/lib/admin/invites";

export type AdminsState = { ok: boolean; message: string; link?: string | null };

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

export async function deleteStaff(formData: FormData) {
  const actor = await requireSuperAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id || id === actor.id) return;

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!target) return;

  if (target.role === "super_admin" && target.is_active) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("is_active", true);

    if ((count ?? 0) <= 1) return;
  }

  const { error } = await admin.auth.admin.deleteUser(id);

  if (!error) await recordAudit("delete", "profiles", id, { email: target.email, role: target.role });

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
  const actor = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "employee");
  const password = String(formData.get("password") ?? "").trim();
  const employmentType = String(formData.get("employment_type") ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!isRole(role) || role === "client") {
    return { ok: false, message: "Choose a valid team role." };
  }
  // Nobody but a super admin may create an account at or above their own rank.
  if (actor.role !== "super_admin" && ROLE_RANK[role] >= ROLE_RANK[actor.role]) {
    return { ok: false, message: "You can only invite roles below your own." };
  }

  const result = await provisionAccount({
    email,
    password: password || null,
    next: "/admin/update-password",
    subject: "Your LYNVO workspace invitation",
    intro: `You have been invited to the LYNVO workspace as ${ROLE_LABELS[role]}.`,
  });

  if (!result.ok) return { ok: false, message: result.message };

  const admin = createAdminClient();
  // The signup trigger creates an inactive editor profile; apply the chosen access.
  const { error } = await admin
    .from("profiles")
    .update({
      role,
      is_active: true,
      employment_type: (EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)
        ? employmentType
        : null,
    })
    .eq("id", result.userId);

  if (error) {
    return { ok: false, message: "The account exists but its role could not be applied. Set it below." };
  }

  await recordAudit("invite", "profiles", result.userId, { email, role });
  revalidatePath("/admin/admins");

  if (!result.link) {
    return { ok: true, message: `Account ready for ${email}. Share the password you just set.`, link: null };
  }

  return {
    ok: true,
    message: result.emailed
      ? `Invite emailed to ${email}. The link below works too.`
      : `Invite link created for ${email}. Email delivery is unavailable, so send this link yourself.`,
    link: result.link,
  };
}
