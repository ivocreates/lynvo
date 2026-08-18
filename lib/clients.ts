export type ClientStatus = "active" | "paused" | "archived";
export type EngagementStatus =
  | "discovery"
  | "in_progress"
  | "review"
  | "delivered"
  | "on_hold"
  | "cancelled";
export type MilestoneStatus = "planned" | "in_progress" | "done" | "blocked";
export type DeliverableKind = "preview" | "file" | "link" | "report";
export type DeliverableStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "revision_requested"
  | "delivered";

export const CLIENT_STATUSES: ClientStatus[] = ["active", "paused", "archived"];
export const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  "discovery",
  "in_progress",
  "review",
  "delivered",
  "on_hold",
  "cancelled",
];
export const MILESTONE_STATUSES: MilestoneStatus[] = ["planned", "in_progress", "done", "blocked"];
export const DELIVERABLE_KINDS: DeliverableKind[] = ["preview", "file", "link", "report"];
export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "pending",
  "in_review",
  "approved",
  "revision_requested",
  "delivered",
];

export const ENGAGEMENT_LABELS: Record<EngagementStatus, string> = {
  discovery: "Discovery",
  in_progress: "In progress",
  review: "In review",
  delivered: "Delivered",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

export const MILESTONE_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

export const DELIVERABLE_LABELS: Record<DeliverableStatus, string> = {
  pending: "Pending",
  in_review: "Ready for review",
  approved: "Approved",
  revision_requested: "Changes requested",
  delivered: "Delivered",
};

export const DELIVERABLE_KIND_LABELS: Record<DeliverableKind, string> = {
  preview: "Preview",
  file: "File",
  link: "Link",
  report: "Report",
};

export const ENGAGEMENT_STYLES: Record<EngagementStatus, string> = {
  discovery: "bg-sand-400/25 text-clay-500",
  in_progress: "bg-brand-700/10 text-brand-700",
  review: "bg-sand-400/25 text-clay-500",
  delivered: "bg-success/10 text-success",
  on_hold: "bg-border/50 text-text-primary/70",
  cancelled: "bg-error/10 text-error",
};

export const DELIVERABLE_STYLES: Record<DeliverableStatus, string> = {
  pending: "bg-border/50 text-text-primary/70",
  in_review: "bg-brand-700/10 text-brand-700",
  approved: "bg-success/10 text-success",
  revision_requested: "bg-error/10 text-error",
  delivered: "bg-success/10 text-success",
};

export const MILESTONE_STYLES: Record<MilestoneStatus, string> = {
  planned: "border-border bg-surface",
  in_progress: "border-brand-700/40 bg-brand-700/5",
  done: "border-success/40 bg-success/5",
  blocked: "border-error/40 bg-error/5",
};

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logo_url: string | null;
  status: ClientStatus;
  notes: string | null;
};

export type Engagement = {
  id: string;
  client_id: string;
  title: string;
  summary: string | null;
  status: EngagementStatus;
  progress: number;
  start_date: string | null;
  target_date: string | null;
  delivered_at: string | null;
  project_id: string | null;
  lead_id: string | null;
};

export type Milestone = {
  id: string;
  engagement_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  visible_to_client: boolean;
};

export type Deliverable = {
  id: string;
  engagement_id: string;
  title: string;
  description: string | null;
  kind: DeliverableKind;
  url: string | null;
  version: string | null;
  status: DeliverableStatus;
  due_date: string | null;
  delivered_at: string | null;
  client_feedback: string | null;
  reviewed_at: string | null;
  visible_to_client: boolean;
  position: number;
};

export type ClientReport = {
  id: string;
  client_id: string;
  engagement_id: string | null;
  title: string;
  period_start: string | null;
  period_end: string | null;
  body: string;
  published: boolean;
  published_at: string | null;
};

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPeriod(start: string | null, end: string | null) {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start ?? end);
}

/** Only http(s) links are rendered, so a stored value cannot become javascript:. */
export function safeUrl(url: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function milestoneProgress(milestones: Milestone[]) {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((milestone) => milestone.status === "done").length;
  return Math.round((done / milestones.length) * 100);
}
