import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_STYLES,
  type Task,
  type TaskStatus,
} from "@/lib/team";
import { createTask, reviewTask, deleteTask } from "./actions";

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: { status?: string; assignee?: string };
}) {
  await requireManager();

  const supabase = createClient();
  const [{ data: peopleRows }, { data: projectRows }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email, role").eq("is_active", true),
    supabase.from("projects").select("id, title").order("created_at", { ascending: false }).limit(100),
  ]);

  const people = (peopleRows ?? []) as Record<string, any>[];
  const projects = (projectRows ?? []) as Record<string, any>[];
  const nameOf = (id: string | null) => {
    const person = people.find((entry) => entry.id === id);
    return person ? person.display_name ?? person.email : "Unassigned";
  };

  let query = supabase.from("staff_tasks").select("*").order("created_at", { ascending: false }).limit(200);
  const activeStatus = searchParams.status;
  if (activeStatus && TASK_STATUSES.includes(activeStatus as TaskStatus)) {
    query = query.eq("status", activeStatus);
  }
  if (searchParams.assignee) query = query.eq("assignee_id", searchParams.assignee);

  const { data } = await query;
  const tasks = (data ?? []) as Task[];
  const awaitingReview = tasks.filter((task) => task.status === "completed");

  return (
    <div>
      <PageHeader
        stamp="WORK"
        title="Tasks"
        description="Assign work, track progress, and approve completed tasks."
      />

      <form action={createTask} className="mb-8 rounded-card border border-border bg-surface p-5">
        <p className="section-stamp mb-3">NEW TASK</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="title" className={LABEL_CLASS}>
              Title
            </label>
            <input id="title" name="title" required className={FIELD_CLASS} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="description" className={LABEL_CLASS}>
              Description
            </label>
            <textarea id="description" name="description" rows={3} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="assignee_id" className={LABEL_CLASS}>
              Assign to
            </label>
            <select id="assignee_id" name="assignee_id" className={FIELD_CLASS}>
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name ?? person.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className={LABEL_CLASS}>
              Priority
            </label>
            <select id="priority" name="priority" defaultValue="normal" className={FIELD_CLASS}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="due_date" className={LABEL_CLASS}>
              Due date
            </label>
            <input id="due_date" name="due_date" type="date" className={FIELD_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="project_id" className={LABEL_CLASS}>
              Related project
            </label>
            <select id="project_id" name="project_id" className={FIELD_CLASS}>
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
            >
              Create task
            </button>
          </div>
        </div>
      </form>

      {awaitingReview.length > 0 && !activeStatus && (
        <p className="mb-4 rounded-card border border-clay-500/30 bg-sand-400/15 px-4 py-3 text-sm text-clay-500">
          {awaitingReview.length} task{awaitingReview.length === 1 ? "" : "s"} waiting for your review.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/tasks"
          className={`rounded-card border px-3 py-1.5 text-sm ${
            !activeStatus ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-surface"
          }`}
        >
          All
        </Link>
        {TASK_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/tasks?status=${status}`}
            className={`rounded-card border px-3 py-1.5 text-sm ${
              activeStatus === status
                ? "border-brand-700 bg-brand-700 text-text-inverse"
                : "border-border hover:bg-surface"
            }`}
          >
            {TASK_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No tasks here yet.
        </div>
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900">{task.title}</p>
                  <p className="mt-1 text-xs text-text-primary/60">
                    {nameOf(task.assignee_id)}
                    {task.due_date ? ` · due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : ""}
                    {task.priority !== "normal" ? ` · ${task.priority}` : ""}
                  </p>
                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary/80">
                      {task.description}
                    </p>
                  )}
                </div>
                <span className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${TASK_STATUS_STYLES[task.status]}`}>
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
                <form action={reviewTask} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <div>
                    <label htmlFor={`note-${task.id}`} className={LABEL_CLASS}>
                      Review note
                    </label>
                    <input
                      id={`note-${task.id}`}
                      name="review_note"
                      defaultValue={task.review_note ?? ""}
                      placeholder="Optional feedback"
                      className="mt-1 w-64 rounded-card border border-border bg-canvas-warm px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    name="status"
                    value="approved"
                    className="rounded-card bg-brand-700 px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-ink-900"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="working"
                    className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                  >
                    Send back
                  </button>
                </form>
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <ConfirmSubmit
                    message="Delete this task?"
                    className="rounded-card border border-error/40 px-3 py-1.5 text-sm text-error hover:bg-error/5"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
