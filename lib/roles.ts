/** Client-safe role constants. lib/auth.ts is server-only. */

export type Role =
  | "super_admin"
  | "senior_partner"
  | "admin"
  | "junior_partner"
  | "editor"
  | "employee"
  | "intern";

/** Mirrors the ladder in migration 0009. */
export const ROLE_RANK: Record<Role, number> = {
  intern: 1,
  employee: 2,
  editor: 3,
  junior_partner: 4,
  admin: 5,
  senior_partner: 6,
  super_admin: 7,
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  senior_partner: "Senior partner",
  admin: "Admin",
  junior_partner: "Junior partner",
  editor: "Editor",
  employee: "Employee",
  intern: "Intern",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "internship", "freelance", "partner"] as const;

export const isRole = (value: string): value is Role => (ROLES as string[]).includes(value);

/** Employees and interns use /staff; editors and above also get the CMS. */
export const hasCmsAccess = (role: Role) => ROLE_RANK[role] >= ROLE_RANK.editor;
