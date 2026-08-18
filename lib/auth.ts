import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type Role } from "@/lib/roles";

export type { Role } from "@/lib/roles";
export { ROLES, ROLE_LABELS, ROLE_RANK, EMPLOYMENT_TYPES, isRole, hasCmsAccess } from "@/lib/roles";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  is_active: boolean;
  title: string | null;
  department: string | null;
  employment_type: string | null;
  joined_on: string | null;
  ends_on: string | null;
  manager_id: string | null;
  avatar_url: string | null;
}

const PROFILE_COLUMNS =
  "id, email, display_name, role, is_active, title, department, employment_type, joined_on, ends_on, manager_id, avatar_url";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  return data as unknown as Profile;
});

export async function requireRole(minimum: Role): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (ROLE_RANK[profile.role] < ROLE_RANK[minimum]) {
    // Employees and interns have no CMS access; send them to their own dashboard.
    redirect(ROLE_RANK[profile.role] < ROLE_RANK.editor ? "/staff" : "/admin?denied=1");
  }

  return profile;
}

/** Anyone active on the team, interns included. */
export const requireTeamMember = () => requireRole("intern");
export const requireStaff = () => requireRole("editor");
export const requireManager = () => requireRole("junior_partner");
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
