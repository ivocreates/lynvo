import Link from "next/link";
import { requireTeamMember, hasRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatMeetingWhen, getUpcomingMeetings, goalProgress, type Goal, type Task } from "@/lib/team";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default async function StaffOverviewPage() {
  const profile = await requireTeamMember();
  const isManager = hasRole(profile, "junior_partner");

  const supabase = createClient();
  const [{ data: manager }, { data: taskRows }, { data: goalRows }, meetings] = await Promise.all([
    profile.manager_id
      ? supabase.from("profiles").select("display_name, email").eq("id", profile.manager_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("staff_tasks")
      .select("*")
      .eq("assignee_id", profile.id)
      .neq("status", "approved")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("staff_goals")
      .select("*")
      .eq("status", "active")
      .or(`owner_id.eq.${profile.id},owner_id.is.null`)
      .limit(4),
    getUpcomingMeetings(isManager),
  ]);

  const tasks = (taskRows ?? []) as Task[];
  const goals = (goalRows ?? []) as Goal[];
  const nextMeeting = meetings[0];

  const facts = [
    ["Role", ROLE_LABELS[profile.role]],
    ["Title", profile.title ?? "—"],
    ["Department", profile.department ?? "—"],
    ["Engagement", profile.employment_type ?? "—"],
    ["Joined", formatDate(profile.joined_on)],
    ["Ends", formatDate(profile.ends_on)],
    ["Reports to", manager ? manager.display_name ?? manager.email : "—"],
    ["Open tasks", String(tasks.length)],
  ];

  return (
    <div>
      <p className="section-stamp">WORKSPACE</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">
        Welcome back, {(profile.display_name ?? profile.email).split(" ")[0]}
      </h1>

      {nextMeeting && (
        <div className="mt-6 rounded-card border border-brand-700/30 bg-brand-700/5 p-5">
          <p className="section-stamp text-brand-700">NEXT MEETING</p>
          <p className="mt-2 font-display text-lg font-semibold text-ink-900">{nextMeeting.meeting.title}</p>
          <p className="mt-1 text-sm text-text-primary/80">
            {formatMeetingWhen(nextMeeting.meeting)}
            {nextMeeting.meeting.location ? ` · ${nextMeeting.meeting.location}` : ""}
          </p>
          {nextMeeting.meeting.agenda && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-primary/70">
              {nextMeeting.meeting.agenda}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-card border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-700">{label}</p>
            <p className="mt-2 text-sm font-medium text-ink-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="section-stamp">MY TASKS</p>
            <Link href="/staff/tasks" className="text-sm text-brand-700 underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-4 text-sm text-text-primary/70">Nothing assigned right now.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-900">{task.title}</span>
                  <span className="shrink-0 font-mono text-xs uppercase text-text-primary/60">{task.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="section-stamp">ACTIVE GOALS</p>
            <Link href="/staff/goals" className="text-sm text-brand-700 underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="mt-4 text-sm text-text-primary/70">No active goals.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {goals.map((goal) => {
                const progress = goalProgress(goal);
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink-900">{goal.title}</span>
                      {progress !== null && (
                        <span className="shrink-0 text-xs text-text-primary/60">{progress}%</span>
                      )}
                    </div>
                    {progress !== null && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-card bg-border/60">
                        <div className="h-full bg-brand-700" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-6">
        <p className="section-stamp">RECORDS</p>
        <p className="mt-3 font-display text-lg font-semibold text-ink-900">My documents</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
          Your contract and company documents, ready to read or save as PDF.
        </p>
        <Link
          href="/staff/documents"
          className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Open documents →
        </Link>
      </div>

      {hasRole(profile, "editor") && (
        <p className="mt-8 text-xs text-text-primary/60">
          You also have CMS access —{" "}
          <Link href="/admin" className="text-brand-700 underline underline-offset-4">
            open the admin dashboard
          </Link>
          .
        </p>
      )}
    </div>
  );
}
