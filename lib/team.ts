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
  timezone: string | null;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

type WallClock = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallClockIn(instant: Date, timeZone: string): WallClock {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // "24" appears at midnight in some locales.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function offsetMs(instant: Date, timeZone: string) {
  const clock = wallClockIn(instant, timeZone);
  const asUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Resolves a wall-clock time in `timeZone` to the matching UTC instant. */
function instantFromWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - offsetMs(new Date(guess), timeZone);
  // A second pass settles days where the offset changes (DST boundaries).
  ts = guess - offsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function meetingTimezone(meeting: Meeting) {
  return meeting.timezone?.trim() || DEFAULT_TIMEZONE;
}

/** Next occurrence of a meeting, resolved in the meeting's own timezone. */
export function nextMeetingAt(meeting: Meeting, from = new Date()): Date | null {
  const timeZone = meetingTimezone(meeting);
  const [hours, minutes] = meeting.start_time.split(":").map(Number);

  if (meeting.cadence === "once") {
    if (!meeting.starts_on) return null;
    const [year, month, day] = meeting.starts_on.split("-").map(Number);
    const once = instantFromWallClock(year, month, day, hours, minutes, timeZone);
    return once < from ? null : once;
  }

  if (meeting.weekday === null) return null;

  const today = wallClockIn(from, timeZone);
  const currentWeekday = weekdayOf(today.year, today.month, today.day);
  let delta = (meeting.weekday - currentWeekday + 7) % 7;

  let candidate = instantFromWallClock(today.year, today.month, today.day + delta, hours, minutes, timeZone);
  if (candidate < from) {
    delta += 7;
    candidate = instantFromWallClock(today.year, today.month, today.day + delta, hours, minutes, timeZone);
  }

  if (meeting.cadence === "fortnightly") {
    const at = wallClockIn(candidate, timeZone);
    const dayOfYear = Math.floor(
      (Date.UTC(at.year, at.month - 1, at.day) - Date.UTC(at.year, 0, 1)) / 86_400_000
    );
    if (Math.floor(dayOfYear / 7) % 2 === 1) {
      candidate = instantFromWallClock(today.year, today.month, today.day + delta + 7, hours, minutes, timeZone);
    }
  }

  return candidate;
}

export function formatMeetingWhen(meeting: Meeting) {
  const next = nextMeetingAt(meeting);
  if (!next) return "Not scheduled";

  const timeZone = meetingTimezone(meeting);
  const days = Math.round((next.getTime() - Date.now()) / 86_400_000);
  const relative = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

  const when = new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(next);

  return `${when} (${relative})`;
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
