import { createClient } from "@/lib/supabase/server";

export type TaskStatus = "todo" | "working" | "completed" | "approved" | "blocked";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type GoalStatus = "active" | "achieved" | "missed" | "paused";
export type NoteVisibility = "private" | "team" | "managers";

export const TASK_STATUSES: TaskStatus[] = ["todo", "working", "completed", "approved", "blocked"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];
export const GOAL_STATUSES: GoalStatus[] = ["active", "achieved", "missed", "paused"];
export const NOTE_VISIBILITIES: NoteVisibility[] = ["private", "team", "managers"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  working: "Working",
  completed: "Completed",
  approved: "Approved",
  blocked: "Blocked",
};

export const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-border/50 text-text-primary/70",
  working: "bg-brand-700/10 text-brand-700",
  completed: "bg-sand-400/25 text-clay-500",
  approved: "bg-success/10 text-success",
  blocked: "bg-error/10 text-error",
};

export const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  private: "Only me",
  team: "Whole team",
  managers: "Managers only",
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string | null;
  project_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  metric: string | null;
  target_value: number | null;
  current_value: number;
  due_date: string | null;
  status: GoalStatus;
};

export type Note = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  visibility: NoteVisibility;
  pinned: boolean;
  updated_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  agenda: string | null;
  cadence: string;
  weekday: number | null;
  start_time: string;
  duration_minutes: number;
  starts_on: string | null;
  location: string | null;
  audience: string;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Next occurrence of a recurring meeting, in the server's local time. */
export function nextMeetingAt(meeting: Meeting, from = new Date()): Date | null {
  const [hours, minutes] = meeting.start_time.split(":").map(Number);

  if (meeting.cadence === "once") {
    if (!meeting.starts_on) return null;
    const once = new Date(`${meeting.starts_on}T00:00:00`);
    once.setHours(hours, minutes, 0, 0);
    return once < from ? null : once;
  }

  if (meeting.weekday === null) return null;

  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  let delta = (meeting.weekday - next.getDay() + 7) % 7;
  if (delta === 0 && next < from) delta = 7;
  next.setDate(next.getDate() + delta);

  if (meeting.cadence === "fortnightly") {
    // Anchor on ISO week parity so the same fortnight is picked for everyone.
    const week = Math.floor((next.getTime() - new Date(next.getFullYear(), 0, 1).getTime()) / 604_800_000);
    if (week % 2 === 1) next.setDate(next.getDate() + 7);
  }

  return next;
}

export function formatMeetingWhen(meeting: Meeting) {
  const next = nextMeetingAt(meeting);
  if (!next) return "Not scheduled";

  const days = Math.round((next.getTime() - Date.now()) / 86_400_000);
  const relative = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

  return `${next.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  })} at ${next.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} (${relative})`;
}

export async function getUpcomingMeetings(isManager: boolean) {
  const supabase = createClient();
  const query = supabase.from("meetings").select("*").eq("is_active", true);
  if (!isManager) query.eq("audience", "all");

  const { data } = await query;
  const meetings = (data ?? []) as Meeting[];

  return meetings
    .map((meeting) => ({ meeting, at: nextMeetingAt(meeting) }))
    .filter((entry): entry is { meeting: Meeting; at: Date } => entry.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function goalProgress(goal: Goal) {
  if (!goal.target_value || goal.target_value <= 0) return null;
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
}
