import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type Role } from "@/lib/roles";
import {
  PERMISSION_KEYS,
  holdsAllPermissions,
  isPermission,
  resolvePermissions,
  type Permission,
} from "@/lib/permissions";

export type { Permission } from "@/lib/permissions";

export type { Role } from "@/lib/roles";
export {
  ROLES,
  STAFF_ROLES,
  ROLE_LABELS,
  ROLE_RANK,
  EMPLOYMENT_TYPES,
  isRole,
  hasCmsAccess,
  isClient,
} from "@/lib/roles";

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
  client_id: string | null;
}

const PROFILE_COLUMNS =
  "id, email, display_name, role, is_active, title, department, employment_type, joined_on, ends_on, manager_id, avatar_url, client_id";

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
    // Clients and sub-editor staff each have their own home.
    if (profile.role === "client") redirect("/client");
    redirect(ROLE_RANK[profile.role] < ROLE_RANK.editor ? "/staff" : "/admin?denied=1");
  }

  return profile;
}

/** A signed-in client, scoped to the company they belong to. */
export async function requireClient(): Promise<Profile & { client_id: string }> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (profile.role !== "client") redirect("/admin");
  if (!profile.client_id) redirect("/admin/login?unlinked=1");

  return profile as Profile & { client_id: string };
}

/** Effective module permissions for a profile (see lib/permissions.ts). */
export const getPermissions = cache(async (profile: Profile): Promise<Permission[]> => {
  if (profile.role === "client") return [];
  if (holdsAllPermissions(profile.role)) return [...PERMISSION_KEYS];

  const supabase = createClient();
  const [{ data: roleRows }, { data: personalRows }] = await Promise.all([
    supabase.from("role_permissions").select("permission").eq("role", profile.role),
    supabase.from("staff_permissions").select("permission, allowed").eq("user_id", profile.id),
  ]);

  // Before migration 0028 these tables do not exist; fall back to the old role tiers.
  if (!roleRows && !personalRows) {
    const legacy: Permission[] = [];
    if (ROLE_RANK[profile.role] >= ROLE_RANK.editor) legacy.push("billing.manage", "clients.manage", "website");
    if (ROLE_RANK[profile.role] >= ROLE_RANK.employee) legacy.push("billing.draft");
    return legacy;
  }

  return resolvePermissions(
    profile.role,
    ((roleRows ?? []) as { permission: string }[]).map((row) => row.permission).filter(isPermission),
    ((personalRows ?? []) as { permission: string; allowed: boolean }[])
      .filter((row) => isPermission(row.permission))
      .map((row) => ({ permission: row.permission as Permission, allowed: row.allowed }))
  );
});

export async function can(profile: Profile, permission: Permission) {
  return (await getPermissions(profile)).includes(permission);
}

/** Team member who holds `permission`; everyone else is sent to their own home. */
export async function requirePermission(permission: Permission): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (profile.role === "client") redirect("/client");
  if (!(await can(profile, permission))) {
    redirect((await getPermissions(profile)).length > 0 || ROLE_RANK[profile.role] >= ROLE_RANK.editor
      ? "/admin?denied=1"
      : "/staff");
  }

  return profile;
}

/** Anyone allowed into the /admin console: CMS tier, or a team member with any module permission. */
export async function requireConsoleAccess(): Promise<{ profile: Profile; permissions: Permission[] }> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/admin/login");
  if (profile.role === "client") redirect("/client");

  const permissions = await getPermissions(profile);
  if (ROLE_RANK[profile.role] < ROLE_RANK.editor && permissions.filter((p) => p !== "billing.draft").length === 0) {
    redirect("/staff");
  }

  return { profile, permissions };
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
