import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DELIVERABLE_KIND_LABELS,
  DELIVERABLE_LABELS,
  DELIVERABLE_STYLES,
  ENGAGEMENT_LABELS,
  ENGAGEMENT_STYLES,
  MILESTONE_LABELS,
  MILESTONE_STYLES,
  formatDate,
  formatPeriod,
  safeUrl,
  type ClientReport,
  type Deliverable,
  type Engagement,
  type Milestone,
} from "@/lib/clients";
import { reviewDeliverable, submitReview } from "./actions";
import ReviewForm from "@/components/client/review-form";

export default async function ClientOverviewPage() {
  const profile = await requireClient();

  const supabase = createClient();
  const [{ data: engagementRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("client_engagements")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_reports")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const engagements = (engagementRows ?? []) as Engagement[];
  const reports = (reportRows ?? []) as ClientReport[];
  const engagementIds = engagements.map((engagement) => engagement.id);

  const [{ data: milestoneRows }, { data: deliverableRows }] =
    engagementIds.length > 0
      ? await Promise.all([
          supabase.from("client_milestones").select("*").in("engagement_id", engagementIds).order("position"),
          supabase.from("client_deliverables").select("*").in("engagement_id", engagementIds).order("position"),
        ])
      : [{ data: [] }, { data: [] }];

  const milestones = (milestoneRows ?? []) as Milestone[];
  const deliverables = (deliverableRows ?? []) as Deliverable[];
  const awaiting = deliverables.filter((deliverable) => deliverable.status === "in_review");

  return (
    <div>
      <p className="section-stamp">YOUR PROJECTS</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Work in progress</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Live status, timeline, and previews for everything we&apos;re building for you.
      </p>

      {awaiting.length > 0 && (
        <p className="mt-6 rounded-card border border-brand-700/30 bg-brand-700/5 px-4 py-3 text-sm text-brand-700">
          {awaiting.length} item{awaiting.length === 1 ? " is" : "s are"} waiting for your review below.
        </p>
      )}

      {engagements.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No active projects yet. We&apos;ll post updates here as soon as work begins.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {engagements.map((engagement) => {
            const theirMilestones = milestones.filter((m) => m.engagement_id === engagement.id);
            const theirDeliverables = deliverables.filter((d) => d.engagement_id === engagement.id);

            return (
              <section key={engagement.id} className="rounded-card border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold text-ink-900">{engagement.title}</h2>
                    {engagement.summary && (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/80">{engagement.summary}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${ENGAGEMENT_STYLES[engagement.status]}`}
                  >
                    {ENGAGEMENT_LABELS[engagement.status]}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-text-primary/60">
                    <span>
                      {engagement.start_date ? `Started ${formatDate(engagement.start_date)}` : "Not started"}
                      {engagement.target_date ? ` · Target ${formatDate(engagement.target_date)}` : ""}
                    </span>
                    <span>{engagement.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-card bg-border/60">
                    <div className="h-full bg-brand-700" style={{ width: `${engagement.progress}%` }} />
                  </div>
                </div>

                {theirMilestones.length > 0 && (
                  <div className="mt-6">
                    <p className="section-stamp">TIMELINE</p>
                    <ol className="mt-3 space-y-2">
                      {theirMilestones.map((milestone) => (
                        <li
                          key={milestone.id}
                          className={`rounded-card border p-4 ${MILESTONE_STYLES[milestone.status]}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-ink-900">{milestone.title}</p>
                            <span className="font-mono text-xs uppercase text-text-primary/60">
                              {MILESTONE_LABELS[milestone.status]}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="mt-1 text-sm leading-6 text-text-primary/75">{milestone.description}</p>
                          )}
                          <p className="mt-1 text-xs text-text-primary/55">
                            {milestone.status === "done" && milestone.completed_at
                              ? `Completed ${new Date(milestone.completed_at).toLocaleDateString("en-IN")}`
                              : milestone.due_date
                                ? `Due ${formatDate(milestone.due_date)}`
                                : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {theirDeliverables.length > 0 && (
                  <div className="mt-6">
                    <p className="section-stamp">DELIVERIES &amp; PREVIEWS</p>
                    <ul className="mt-3 space-y-3">
                      {theirDeliverables.map((deliverable) => {
                        const url = safeUrl(deliverable.url);
                        const canReview = deliverable.status === "in_review";

                        return (
                          <li key={deliverable.id} className="rounded-card border border-border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-ink-900">
                                  {deliverable.title}
                                  {deliverable.version ? (
                                    <span className="ml-2 font-mono text-xs text-text-primary/60">
                                      {deliverable.version}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="mt-1 text-xs text-text-primary/60">
                                  {DELIVERABLE_KIND_LABELS[deliverable.kind]}
                                  {deliverable.due_date ? ` · due ${formatDate(deliverable.due_date)}` : ""}
                                </p>
                                {deliverable.description && (
                                  <p className="mt-2 text-sm leading-6 text-text-primary/75">
                                    {deliverable.description}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${DELIVERABLE_STYLES[deliverable.status]}`}
                              >
                                {DELIVERABLE_LABELS[deliverable.status]}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                                >
                                  {deliverable.kind === "preview" ? "Open preview" : "Open"}
                                </a>
                              )}
                              {deliverable.client_feedback && (
                                <p className="text-xs text-text-primary/60">
                                  Your note: {deliverable.client_feedback}
                                </p>
                              )}
                            </div>

                            {canReview && (
                              <form action={reviewDeliverable} className="mt-4 border-t border-border pt-3">
                                <input type="hidden" name="id" value={deliverable.id} />
                                <label
                                  htmlFor={`feedback-${deliverable.id}`}
                                  className="block text-xs uppercase tracking-[0.18em] text-text-primary/60"
                                >
                                  Feedback (optional)
                                </label>
                                <textarea
                                  id={`feedback-${deliverable.id}`}
                                  name="client_feedback"
                                  rows={2}
                                  className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                                />
                                <div className="mt-3 flex flex-wrap gap-3">
                                  <button
                                    type="submit"
                                    name="decision"
                                    value="approved"
                                    className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="submit"
                                    name="decision"
                                    value="revision_requested"
                                    className="rounded-card border border-border px-4 py-2 text-sm hover:bg-canvas-warm"
                                  >
                                    Request changes
                                  </button>
                                </div>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {reports.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <p className="section-stamp">LATEST REPORTS</p>
            <Link href="/client/reports" className="text-sm text-brand-700 underline-offset-4 hover:underline">
              All reports
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/client/reports/${report.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm hover:bg-canvas-warm"
                >
                  <span className="text-ink-900">{report.title}</span>
                  <span className="text-xs text-text-primary/60">
                    {formatPeriod(report.period_start, report.period_end)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <p className="section-stamp">SHARE YOUR EXPERIENCE</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900">Leave a review</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
          Your review will appear publicly after our team approves it.
        </p>
        <ReviewForm action={submitReview} />
      </section>
    </div>
  );
}
