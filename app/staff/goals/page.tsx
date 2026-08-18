import { requireTeamMember, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GOAL_STATUSES, goalProgress, type Goal } from "@/lib/team";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { createGoal, updateGoalProgress, deleteGoal } from "./actions";

export const metadata = { title: "Goals" };

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function StaffGoalsPage() {
  const profile = await requireTeamMember();
  const isManager = hasRole(profile, "junior_partner");

  const supabase = createClient();
  const [{ data: goalRows }, { data: peopleRows }] = await Promise.all([
    supabase.from("staff_goals").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, display_name, email").eq("is_active", true),
  ]);

  const goals = (goalRows ?? []) as Goal[];
  const people = (peopleRows ?? []) as Record<string, any>[];
  const ownerOf = (id: string | null) => {
    if (!id) return "Company goal";
    const person = people.find((entry) => entry.id === id);
    return person ? person.display_name ?? person.email : "Unassigned";
  };

  const company = goals.filter((goal) => !goal.owner_id);
  const mine = goals.filter((goal) => goal.owner_id === profile.id);
  const others = goals.filter((goal) => goal.owner_id && goal.owner_id !== profile.id);

  const renderGoal = (goal: Goal) => {
    const progress = goalProgress(goal);
    const canEdit = isManager || goal.owner_id === profile.id;

    return (
      <li key={goal.id} className="rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink-900">{goal.title}</p>
            <p className="mt-1 text-xs text-text-primary/60">
              {ownerOf(goal.owner_id)}
              {goal.due_date ? ` · by ${new Date(`${goal.due_date}T00:00:00`).toLocaleDateString()}` : ""}
            </p>
          </div>
          <span className="rounded-card bg-canvas-warm px-2 py-1 font-mono text-xs uppercase text-text-primary/70">
            {goal.status}
          </span>
        </div>

        {goal.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-primary/80">{goal.description}</p>
        )}

        {progress !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-primary/60">
              <span>
                {goal.current_value} / {goal.target_value} {goal.metric ?? ""}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-card bg-border/60">
              <div className="h-full bg-brand-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <form action={updateGoalProgress} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={goal.id} />
              <div>
                <label htmlFor={`value-${goal.id}`} className={LABEL_CLASS}>
                  Progress
                </label>
                <input
                  id={`value-${goal.id}`}
                  name="current_value"
                  type="number"
                  step="any"
                  defaultValue={goal.current_value}
                  className="mt-1 w-28 rounded-card border border-border bg-canvas-warm px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={`status-${goal.id}`} className={LABEL_CLASS}>
                  Status
                </label>
                <select
                  id={`status-${goal.id}`}
                  name="status"
                  defaultValue={goal.status}
                  className="mt-1 rounded-card border border-border bg-canvas-warm px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                >
                  {GOAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
              >
                Update
              </button>
            </form>
            {isManager && (
              <form action={deleteGoal}>
                <input type="hidden" name="id" value={goal.id} />
                <ConfirmSubmit message="Delete this goal?" />
              </form>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <p className="section-stamp">DIRECTION</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Goals</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Company objectives and personal targets, with progress you can update as you go.
      </p>

      {isManager && (
        <form action={createGoal} className="mt-8 rounded-card border border-border bg-surface p-5">
          <p className="section-stamp mb-3">NEW GOAL</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="title" className={LABEL_CLASS}>
                Title
              </label>
              <input id="title" name="title" required className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="owner_id" className={LABEL_CLASS}>
                Owner
              </label>
              <select id="owner_id" name="owner_id" className={FIELD_CLASS}>
                <option value="">Company goal</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name ?? person.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="metric" className={LABEL_CLASS}>
                Metric
              </label>
              <input id="metric" name="metric" placeholder="projects, posts, %" className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="target_value" className={LABEL_CLASS}>
                Target
              </label>
              <input id="target_value" name="target_value" type="number" step="any" className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="due_date" className={LABEL_CLASS}>
                Due date
              </label>
              <input id="due_date" name="due_date" type="date" className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className={LABEL_CLASS}>
                Description
              </label>
              <textarea id="description" name="description" rows={2} className={FIELD_CLASS} />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
          >
            Create goal
          </button>
        </form>
      )}

      {[
        ["Company goals", company],
        ["My goals", mine],
        ["Team goals", others],
      ].map(([label, list]) => {
        const items = list as Goal[];
        if (items.length === 0) return null;

        return (
          <section key={label as string} className="mt-10">
            <p className="section-stamp">{(label as string).toUpperCase()}</p>
            <ul className="mt-4 space-y-4">{items.map(renderGoal)}</ul>
          </section>
        );
      })}

      {goals.length === 0 && (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No goals set yet.
        </div>
      )}
    </div>
  );
}
