import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "super_admin" | "admin" | "editor";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  is_active: boolean;
}

const ROLE_RANK: Record<Role, number> = {
  editor: 1,
  admin: 2,
  super_admin: 3,
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  return data as unknown as Profile;
});

export async function requireRole(minimum: Role): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (ROLE_RANK[profile.role] < ROLE_RANK[minimum]) redirect("/admin?denied=1");

  return profile;
}

export const requireStaff = () => requireRole("editor");
export const requireAdmin = () => requireRole("admin");
export const requireSuperAdmin = () => requireRole("super_admin");

export function hasRole(profile: Profile, minimum: Role) {
  return ROLE_RANK[profile.role] >= ROLE_RANK[minimum];
}

/** Best-effort audit trail; never blocks the operation that triggered it. */
export async function recordAudit(
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = createClient();
    const profile = await getCurrentProfile();

    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      metadata,
    });
  } catch {
    // Audit logging must not break the mutation.
  }
}
