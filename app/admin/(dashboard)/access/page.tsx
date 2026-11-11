import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import {
  CONFIGURABLE_ROLES,
  PERMISSIONS,
  holdsAllPermissions,
  isPermission,
  resolvePermissions,
  type Permission,
} from "@/lib/permissions";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";
import SubmitButton from "@/components/admin/submit-button";
import { savePersonPermissions, saveRolePermissions } from "./actions";

type Person = { id: string; email: string; display_name: string | null; role: Role; title: string | null; is_active: boolean };

const SELECT =
  "rounded-card border border-border bg-canvas-warm px-2 py-1 text-sm focus:border-brand-700 focus:outline-none";

export default async function AccessPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireAdmin();

  const supabase = createClient();
  const [{ data: roleRows, error: roleError }, { data: personalRows }, { data: peopleRows }] = await Promise.all([
    supabase.from("role_permissions").select("role, permission"),
    supabase.from("staff_permissions").select("user_id, permission, allowed"),
    supabase
      .from("profiles")
      .select("id, email, display_name, role, title, is_active")
      .neq("role", "client")
      .eq("is_active", true)
      .order("display_name"),
  ]);

  const roleGrants = new Map<Role, Permission[]>();
  for (const row of (roleRows ?? []) as { role: Role; permission: string }[]) {
    if (!isPermission(row.permission)) continue;
    roleGrants.set(row.role, [...(roleGrants.get(row.role) ?? []), row.permission]);
  }

  const personal = new Map<string, { permission: Permission; allowed: boolean }[]>();
  for (const row of (personalRows ?? []) as { user_id: string; permission: string; allowed: boolean }[]) {
    if (!isPermission(row.permission)) continue;
    personal.set(row.user_id, [...(personal.get(row.user_id) ?? []), { permission: row.permission, allowed: row.allowed }]);
  }

  const people = (peopleRows ?? []) as Person[];

  return (
    <div>
      <PageHeader
        stamp="TEAM"
        title="Access & permissions"
        description="Choose which modules each role can use, then fine-tune for individual people."
      />

      <Flash
        success={searchParams.saved === "roles" ? "Role permissions saved." : searchParams.saved === "person" ? "Personal access saved." : null}
        error={searchParams.error ? "Could not save permissions. Make sure migration 0028 has been run." : null}
      />

      {roleError && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Permissions are not set up yet. Run migration 0028_permissions_billing_workflow.sql.
        </p>
      )}

      <section className="mb-10 rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">By role</h2>
        <p className="mt-1 text-sm text-text-primary/70">
          Admins, senior partners and super admins always have everything. Clients never see any of this.
        </p>
        <form action={saveRolePermissions} className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="py-2 pr-4 font-medium text-ink-900">Module</th>
                {CONFIGURABLE_ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-medium text-ink-900">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission.key} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ink-900">{permission.label}</p>
                    <p className="text-xs text-text-primary/60">{permission.description}</p>
                  </td>
                  {CONFIGURABLE_ROLES.map((role) => (
                    <td key={role} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        name={`${role}:${permission.key}`}
                        defaultChecked={(roleGrants.get(role) ?? []).includes(permission.key)}
                        aria-label={`${permission.label} for ${ROLE_LABELS[role]}`}
                        className="h-4 w-4 accent-brand-700"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <SubmitButton>Save role permissions</SubmitButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">By person</h2>
        <p className="mt-1 text-sm text-text-primary/70">
          E.g. give your marketing hire (Employee role) Marketing &amp; sales and Draft quotes without making them an editor.
        </p>
        <div className="mt-4 space-y-3">
          {people.map((person) => {
            const overrides = personal.get(person.id) ?? [];
            const effective = resolvePermissions(person.role, roleGrants.get(person.role) ?? [], overrides);
            const all = holdsAllPermissions(person.role);

            return (
              <details key={person.id} id={`person-${person.id}`} className="rounded-card border border-border bg-surface">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink-900">{person.display_name ?? person.email}</p>
                    <p className="text-xs text-text-primary/60">
                      {ROLE_LABELS[person.role]}
                      {person.title ? ` · ${person.title}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {all ? (
                      <span className="rounded-card bg-brand-700/10 px-2 py-0.5 text-xs text-brand-700">Everything</span>
                    ) : effective.length === 0 ? (
                      <span className="text-xs text-text-primary/50">Team workspace only</span>
                    ) : (
                      effective.map((key) => (
                        <span key={key} className="rounded-card bg-brand-700/10 px-2 py-0.5 text-xs text-brand-700">
                          {PERMISSIONS.find((entry) => entry.key === key)?.label}
                        </span>
                      ))
                    )}
                  </div>
                </summary>
                {all ? (
                  <p className="border-t border-border p-4 text-sm text-text-primary/70">
                    {ROLE_LABELS[person.role]}s hold every permission. Change their role on the People page to restrict them.
                  </p>
                ) : (
                  <form action={savePersonPermissions} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <input type="hidden" name="user_id" value={person.id} />
                    {PERMISSIONS.map((permission) => {
                      const override = overrides.find((entry) => entry.permission === permission.key);
                      const fromRole = (roleGrants.get(person.role) ?? []).includes(permission.key);
                      return (
                        <label key={permission.key} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink-900">{permission.label}</span>
                          <select
                            name={permission.key}
                            defaultValue={override ? (override.allowed ? "allow" : "deny") : "default"}
                            className={SELECT}
                          >
                            <option value="default">Role default ({fromRole ? "yes" : "no"})</option>
                            <option value="allow">Allow</option>
                            <option value="deny">Deny</option>
                          </select>
                        </label>
                      );
                    })}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <SubmitButton>Save access for {person.display_name ?? person.email}</SubmitButton>
                    </div>
                  </form>
                )}
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
