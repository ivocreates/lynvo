"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, recordAudit } from "@/lib/auth";
import { CONFIGURABLE_ROLES, PERMISSION_KEYS } from "@/lib/permissions";

/** Replaces the role -> permission matrix with whatever boxes are ticked. */
export async function saveRolePermissions(formData: FormData) {
  const actor = await requireAdmin();

  const rows = CONFIGURABLE_ROLES.flatMap((role) =>
    PERMISSION_KEYS.filter((permission) => formData.get(`${role}:${permission}`) === "on").map((permission) => ({
      role,
      permission,
    }))
  );

  const supabase = createClient();
  const { error: deleteError } = await supabase.from("role_permissions").delete().in("role", CONFIGURABLE_ROLES);
  if (deleteError) redirect("/admin/access?error=roles");

  if (rows.length > 0) {
    const { error } = await supabase.from("role_permissions").insert(rows);
    if (error) redirect("/admin/access?error=roles");
  }

  await recordAudit("update", "role_permissions", null, { by: actor.id, grants: rows.length });
  revalidatePath("/admin", "layout");
  redirect("/admin/access?saved=roles");
}

/** Per-person overrides: "default" follows the role, "allow" / "deny" override it. */
export async function savePersonPermissions(formData: FormData) {
  const actor = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return;

  const overrides = PERMISSION_KEYS.map((permission) => ({
    permission,
    choice: String(formData.get(permission) ?? "default"),
  })).filter((entry) => entry.choice === "allow" || entry.choice === "deny");

  const supabase = createClient();
  await supabase.from("staff_permissions").delete().eq("user_id", userId);

  if (overrides.length > 0) {
    const { error } = await supabase.from("staff_permissions").insert(
      overrides.map((entry) => ({
        user_id: userId,
        permission: entry.permission,
        allowed: entry.choice === "allow",
        granted_by: actor.id,
      }))
    );
    if (error) redirect(`/admin/access?error=person#person-${userId}`);
  }

  await recordAudit("update", "staff_permissions", userId, { overrides: overrides.length });
  revalidatePath("/admin", "layout");
  revalidatePath("/staff", "layout");
  redirect(`/admin/access?saved=person#person-${userId}`);
}
