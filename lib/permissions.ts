/** Client-safe permission constants. Mirrors has_permission() in migration 0028. */

import { ROLE_RANK, type Role } from "@/lib/roles";

export type Permission = "billing.manage" | "billing.draft" | "clients.manage" | "crm" | "website";

export const PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  {
    key: "billing.manage",
    label: "Quotes & invoices",
    description: "Create, send and edit quotes and invoices, convert quotes, record payments and manage subscriptions.",
  },
  {
    key: "billing.draft",
    label: "Draft quotes",
    description: "Prepare quotes from the team workspace for someone with billing access to review and send.",
  },
  {
    key: "clients.manage",
    label: "Client accounts",
    description: "Client records, projects, deliverables, reports, portal invites and legal documents.",
  },
  {
    key: "crm",
    label: "Marketing & sales",
    description: "Lead pipeline, cold calls, research notes and follow-ups.",
  },
  {
    key: "website",
    label: "Website content",
    description: "Pages, services, work, blog and settings for lynvo.studio and lynvo.tech.",
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((entry) => entry.key);

export const isPermission = (value: string): value is Permission =>
  (PERMISSION_KEYS as string[]).includes(value);

/** Admins and above hold every permission implicitly. */
export const holdsAllPermissions = (role: Role) => ROLE_RANK[role] >= ROLE_RANK.admin;

/** Roles whose permissions an admin can configure. */
export const CONFIGURABLE_ROLES: Role[] = ["junior_partner", "editor", "employee", "intern"];

export function resolvePermissions(
  role: Role,
  roleGrants: Permission[],
  personal: { permission: Permission; allowed: boolean }[]
): Permission[] {
  if (role === "client") return [];
  if (holdsAllPermissions(role)) return [...PERMISSION_KEYS];

  const granted = new Set<Permission>(roleGrants);
  for (const entry of personal) {
    if (entry.allowed) granted.add(entry.permission);
    else granted.delete(entry.permission);
  }
  return PERMISSION_KEYS.filter((key) => granted.has(key));
}
