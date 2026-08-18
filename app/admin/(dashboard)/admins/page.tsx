import { createClient } from "@/lib/supabase/server";
import { requireManager, hasRole } from "@/lib/auth";
import { ROLES, ROLE_LABELS, EMPLOYMENT_TYPES } from "@/lib/roles";
import PageHeader from "@/components/admin/page-header";
import InviteForm from "@/components/admin/invite-form";
import { updateStaffAccess, updateStaffDetails } from "./actions";

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function PeoplePage() {
  const actor = await requireManager();
  const canManageAccess = hasRole(actor, "super_admin");

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, role, is_active, title, department, phone, employment_type, joined_on, ends_on, manager_id, created_at"
    )
    .order("created_at", { ascending: true });

  const people = (data ?? []) as Record<string, any>[];
  const managers = people.filter((person) =>
    ["junior_partner", "admin", "senior_partner", "super_admin"].includes(person.role)
  );

  return (
    <div>
      <PageHeader
        stamp="TEAM"
        title="People"
        description="Invite the team, set roles, and keep employment details current."
      />

      {canManageAccess && <InviteForm />}

      <div className="space-y-4">
        {people.map((person) => {
          const isSelf = person.id === actor.id;

          return (
            <details key={person.id} className="rounded-card border border-border bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900">
                    {person.display_name ?? person.email}
                    {isSelf && <span className="section-stamp ml-2">YOU</span>}
                  </p>
                  <p className="text-xs text-text-primary/60">{person.email}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {person.title && <span className="text-text-primary/70">{person.title}</span>}
                  <span className="rounded-card bg-brand-700/10 px-2 py-1 font-mono uppercase text-brand-700">
                    {ROLE_LABELS[person.role as keyof typeof ROLE_LABELS] ?? person.role}
                  </span>
                  <span
                    className={`rounded-card px-2 py-1 font-mono uppercase ${
                      person.is_active ? "bg-success/10 text-success" : "bg-border/50 text-text-primary/60"
                    }`}
                  >
                    {person.is_active ? "active" : "inactive"}
                  </span>
                </div>
              </summary>

              <div className="grid gap-6 border-t border-border p-5 lg:grid-cols-[1.4fr_1fr]">
                <form action={updateStaffDetails} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={person.id} />
                  <div>
                    <label htmlFor={`name-${person.id}`} className={LABEL_CLASS}>
                      Display name
                    </label>
                    <input
                      id={`name-${person.id}`}
                      name="display_name"
                      defaultValue={person.display_name ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor={`title-${person.id}`} className={LABEL_CLASS}>
                      Job title
                    </label>
                    <input
                      id={`title-${person.id}`}
                      name="title"
                      defaultValue={person.title ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor={`dept-${person.id}`} className={LABEL_CLASS}>
                      Department
                    </label>
                    <input
                      id={`dept-${person.id}`}
                      name="department"
                      defaultValue={person.department ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor={`phone-${person.id}`} className={LABEL_CLASS}>
                      Phone
                    </label>
                    <input
                      id={`phone-${person.id}`}
                      name="phone"
                      defaultValue={person.phone ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor={`emp-${person.id}`} className={LABEL_CLASS}>
                      Employment type
                    </label>
                    <select
                      id={`emp-${person.id}`}
                      name="employment_type"
                      defaultValue={person.employment_type ?? ""}
                      className={FIELD_CLASS}
                    >
                      <option value="">Not set</option>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`manager-${person.id}`} className={LABEL_CLASS}>
                      Reports to
                    </label>
                    <select
                      id={`manager-${person.id}`}
                      name="manager_id"
                      defaultValue={person.manager_id ?? ""}
                      className={FIELD_CLASS}
                    >
                      <option value="">Nobody</option>
                      {managers
                        .filter((manager) => manager.id !== person.id)
                        .map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.display_name ?? manager.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`joined-${person.id}`} className={LABEL_CLASS}>
                      Joined on
                    </label>
                    <input
                      id={`joined-${person.id}`}
                      name="joined_on"
                      type="date"
                      defaultValue={person.joined_on ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor={`ends-${person.id}`} className={LABEL_CLASS}>
                      Ends on
                    </label>
                    <input
                      id={`ends-${person.id}`}
                      name="ends_on"
                      type="date"
                      defaultValue={person.ends_on ?? ""}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
                    >
                      Save details
                    </button>
                  </div>
                </form>

                <div className="rounded-card border border-border bg-canvas-warm p-4">
                  <p className="section-stamp">Access</p>
                  {!canManageAccess ? (
                    <p className="mt-3 text-xs text-text-primary/60">
                      Only a super admin can change roles or activation.
                    </p>
                  ) : isSelf ? (
                    <p className="mt-3 text-xs text-text-primary/60">
                      You cannot change your own role or activation.
                    </p>
                  ) : (
                    <form action={updateStaffAccess} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={person.id} />
                      <div>
                        <label htmlFor={`role-${person.id}`} className={LABEL_CLASS}>
                          Role
                        </label>
                        <select
                          id={`role-${person.id}`}
                          name="role"
                          defaultValue={person.role}
                          className={FIELD_CLASS}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text-primary/80">
                        <input
                          name="is_active"
                          type="checkbox"
                          defaultChecked={person.is_active}
                          className="h-4 w-4 rounded border-border accent-brand-700"
                        />
                        Active
                      </label>
                      <button
                        type="submit"
                        className="rounded-card border border-border bg-surface px-4 py-2 text-sm hover:bg-canvas-warm"
                      >
                        Update access
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-text-primary/60">
        New accounts are created inactive by default. The database also refuses to remove the last
        active super admin. Employees and interns sign in at <code>/staff</code>, not the CMS.
      </p>
    </div>
  );
}
