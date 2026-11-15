import type { Role } from "@/lib/roles";
import { ROLE_RANK } from "@/lib/roles";

/** Who is asking. Replaces auth.uid() / my_role() / my_client_id() / has_permission(). */
export interface DbContext {
  userId: string | null;
  role: Role | null;
  isActive: boolean;
  clientId: string | null;
  permissions: Set<string>;
  /** Service role / SECURITY DEFINER: policies are skipped. */
  bypass: boolean;
  /** One-off elevated operations, e.g. a client accepting their own quote. */
  flags: Set<string>;
}

export const ANONYMOUS: DbContext = {
  userId: null,
  role: null,
  isActive: false,
  clientId: null,
  permissions: new Set(),
  bypass: false,
  flags: new Set(),
};

export const SYSTEM: DbContext = { ...ANONYMOUS, bypass: true };

const rank = (ctx: DbContext) => (ctx.role && ctx.isActive ? ROLE_RANK[ctx.role] : -1);

export const isTeamMember = (ctx: DbContext) => Boolean(ctx.userId && ctx.isActive && ctx.role && ctx.role !== "client");
export const isStaff = (ctx: DbContext) => rank(ctx) >= ROLE_RANK.editor;
export const isManager = (ctx: DbContext) => rank(ctx) >= ROLE_RANK.junior_partner;
export const isAdmin = (ctx: DbContext) => rank(ctx) >= ROLE_RANK.admin;
export const isSuperAdmin = (ctx: DbContext) => ctx.isActive && ctx.role === "super_admin";
export const myClientId = (ctx: DbContext) => (ctx.isActive && ctx.role === "client" ? ctx.clientId : null);

export function hasPermission(ctx: DbContext, permission: string) {
  if (!isTeamMember(ctx)) return false;
  if (isAdmin(ctx)) return true;
  return ctx.permissions.has(permission);
}
