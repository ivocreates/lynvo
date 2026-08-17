import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";
import InviteForm from "@/components/admin/invite-form";
import { updateStaffAccess } from "./actions";

const ROLES = [
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

export default async function AdminsPage() {
  const actor = await requireSuperAdmin();

  const supabase = createClient();
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_active, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader
        stamp="ACCESS CONTROL"
        title="Admins"
        description="Invite staff and manage who can sign in to the CMS."
      />

      <InviteForm />

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-canvas-warm">
            <tr>
              <th className="px-4 py-3 font-medium text-ink-900">Account</th>
              <th className="px-4 py-3 font-medium text-ink-900">Role</th>
              <th className="px-4 py-3 font-medium text-ink-900">Active</th>
              <th className="px-4 py-3 text-right font-medium text-ink-900">Apply</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((person: Record<string, any>) => {
              const isSelf = person.id === actor.id;

              return (
                <tr key={person.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-ink-900">{person.display_name ?? person.email}</p>
                    <p className="text-xs text-text-primary/60">{person.email}</p>
                    {isSelf && <p className="section-stamp mt-1">YOU</p>}
                  </td>
                  <td className="px-4 py-3" colSpan={isSelf ? 3 : 1}>
                    {isSelf ? (
                      <span className="text-xs text-text-primary/60">
                        Super admin — you cannot change your own access.
                      </span>
                    ) : (
                      <form
                        action={updateStaffAccess}
                        id={`access-${person.id}`}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={person.id} />
                        <label htmlFor={`role-${person.id}`} className="sr-only">
                          Role
                        </label>
                        <select
                          id={`role-${person.id}`}
                          name="role"
                          defaultValue={person.role}
                          className="rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                        >
                          {ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </form>
                    )}
                  </td>
                  {!isSelf && (
                    <>
                      <td className="px-4 py-3">
                        <input
                          form={`access-${person.id}`}
                          name="is_active"
                          type="checkbox"
                          defaultChecked={person.is_active}
                          className="h-4 w-4 rounded border-border accent-brand-700"
                          aria-label={`Active: ${person.email}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          form={`access-${person.id}`}
                          type="submit"
                          className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                        >
                          Update
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-text-primary/60">
        New accounts are created inactive by default. The database also refuses to remove the last
        active super admin.
      </p>
    </div>
  );
}
