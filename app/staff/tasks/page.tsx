import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_LABELS, TASK_STATUS_STYLES, type Task } from "@/lib/team";
import { updateTaskStatus } from "./actions";

export const metadata = { title: "My tasks" };

const NEXT_ACTIONS: Partial<Record<Task["status"], { status: string; label: string }[]>> = {
  todo: [
    { status: "working", label: "Start working" },
    { status: "blocked", label: "Blocked" },
  ],
  working: [
    { status: "completed", label: "Mark completed" },
    { status: "blocked", label: "Blocked" },
  ],
  blocked: [{ status: "working", label: "Resume" }],
  completed: [{ status: "working", label: "Reopen" }],
};

function dueLabel(due: string | null) {
  if (!due) return null;
  const days = Math.round((new Date(`${due}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-error" };
  if (days === 0) return { text: "Due today", tone: "text-error" };
  if (days <= 3) return { text: `Due in ${days}d`, tone: "text-clay-500" };
  return { text: `Due ${new Date(`${due}T00:00:00`).toLocaleDateString()}`, tone: "text-text-primary/60" };
}

export default async function StaffTasksPage() {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const { data } = await supabase
    .from("staff_tasks")
    .select("*")
    .eq("assignee_id", profile.id)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks = (data ?? []) as Task[];
  const open = tasks.filter((task) => task.status !== "approved");
  const done = tasks.filter((task) => task.status === "approved");

  return (
    <div>
      <p className="section-stamp">WORK</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">My tasks</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Move a task to <strong>Working</strong> when you start and <strong>Completed</strong> when it&apos;s ready.
        A manager reviews it and marks it approved.
      </p>

      {open.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          Nothing assigned to you right now.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {open.map((task) => {
            const due = dueLabel(task.due_date);

            return (
              <li key={task.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-ink-900">{task.title}</p>
                    {task.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary/80">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {task.priority !== "normal" && (
                      <span className="rounded-card bg-canvas-warm px-2 py-1 font-mono uppercase text-text-primary/70">
                        {task.priority}
                      </span>
                    )}
                    <span
                      className={`rounded-card px-2 py-1 font-mono uppercase ${TASK_STATUS_STYLES[task.status]}`}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>

                {task.review_note && task.status !== "approved" && (
                  <p className="mt-3 rounded-card border border-clay-500/30 bg-sand-400/15 p-3 text-sm text-clay-500">
                    <span className="font-medium">Review note:</span> {task.review_note}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  {due && <span className={`text-xs ${due.tone}`}>{due.text}</span>}
                  {(NEXT_ACTIONS[task.status] ?? []).map((action) => (
                    <form key={action.status} action={updateTaskStatus}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="status" value={action.status} />
                      <button
                        type="submit"
                        className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                      >
                        {action.label}
                      </button>
                    </form>
                  ))}
                  {task.status === "completed" && (
                    <span className="text-xs text-text-primary/60">Waiting for review.</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-12">
          <p className="section-stamp">APPROVED</p>
          <ul className="mt-4 space-y-2">
            {done.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-canvas-warm px-4 py-3 text-sm"
              >
                <span className="text-ink-900">{task.title}</span>
                <span className="text-xs text-text-primary/60">
                  {task.reviewed_at ? new Date(task.reviewed_at).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
