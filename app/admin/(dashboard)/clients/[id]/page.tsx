import { notFound } from "next/navigation";
import { requireStaff, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import ClientInviteForm from "@/components/admin/client-invite-form";
import {
  CLIENT_STATUSES,
  DELIVERABLE_KINDS,
  DELIVERABLE_KIND_LABELS,
  DELIVERABLE_LABELS,
  DELIVERABLE_STATUSES,
  DELIVERABLE_STYLES,
  ENGAGEMENT_LABELS,
  ENGAGEMENT_STATUSES,
  MILESTONE_LABELS,
  MILESTONE_STATUSES,
  formatPeriod,
  type Client,
  type ClientReport,
  type Deliverable,
  type Engagement,
  type Milestone,
} from "@/lib/clients";
import {
  updateClientRecord,
  deleteClientRecord,
  saveEngagement,
  deleteEngagement,
  saveMilestone,
  deleteMilestone,
  saveDeliverable,
  deleteDeliverable,
  saveReport,
  deleteReport,
  revokeClientUser,
} from "../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const SMALL =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";
const CHECKBOX = "h-4 w-4 rounded border-border accent-brand-700";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireStaff();
  const canDelete = hasRole(profile, "admin");

  const supabase = createClient();
  const { data: clientRow } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();

  if (!clientRow) notFound();
  const client = clientRow as unknown as Client;

  const [
    { data: engagementRows },
    { data: reportRows },
    { data: portalUsers },
    { data: staffRows },
    { data: projectRows },
  ] = await Promise.all([
    supabase.from("client_engagements").select("*").eq("client_id", params.id).order("created_at"),
    supabase.from("client_reports").select("*").eq("client_id", params.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, display_name, is_active").eq("client_id", params.id),
    supabase.from("profiles").select("id, display_name, email").eq("is_active", true).neq("role", "client"),
    supabase.from("projects").select("id, title").order("created_at", { ascending: false }).limit(100),
  ]);

  const engagements = (engagementRows ?? []) as Engagement[];
  const reports = (reportRows ?? []) as ClientReport[];
  const staff = (staffRows ?? []) as Record<string, any>[];
  const projects = (projectRows ?? []) as Record<string, any>[];

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

  return (
    <div>
      <PageHeader stamp="CLIENT" title={client.name} description="Engagements, timeline, deliveries, and reports." />

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <form action={updateClientRecord} className="rounded-card border border-border bg-surface p-5">
          <input type="hidden" name="id" value={client.id} />
          <p className="section-stamp mb-3">DETAILS</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={LABEL}>Company</label>
              <input id="name" name="name" required defaultValue={client.name} className={FIELD} />
            </div>
            <div>
              <label htmlFor="contact_name" className={LABEL}>Contact</label>
              <input id="contact_name" name="contact_name" defaultValue={client.contact_name ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="email" className={LABEL}>Email</label>
              <input id="email" name="email" type="email" defaultValue={client.email ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="phone" className={LABEL}>Phone</label>
              <input id="phone" name="phone" defaultValue={client.phone ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="website" className={LABEL}>Website</label>
              <input id="website" name="website" defaultValue={client.website ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="status" className={LABEL}>Status</label>
              <select id="status" name="status" defaultValue={client.status} className={FIELD}>
                {CLIENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className={LABEL}>Address</label>
              <textarea id="address" name="address" rows={2} defaultValue={client.address ?? ""} className={FIELD} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className={LABEL}>Internal notes</label>
              <textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ""} className={FIELD} />
              <p className="mt-1 text-xs text-text-primary/60">Never shown in the client portal.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
              Save client
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-5">
            <p className="section-stamp">PORTAL ACCESS</p>
            {(portalUsers ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/70">No portal users yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {((portalUsers ?? []) as Record<string, any>[]).map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-all text-ink-900">{user.display_name ?? user.email}</span>
                    <span className="flex items-center gap-2">
                      <span className={`font-mono text-xs uppercase ${user.is_active ? "text-success" : "text-text-primary/50"}`}>
                        {user.is_active ? "active" : "revoked"}
                      </span>
                      {user.is_active && (
                        <form action={revokeClientUser}>
                          <input type="hidden" name="profile_id" value={user.id} />
                          <input type="hidden" name="client_id" value={client.id} />
                          <ConfirmSubmit message="Revoke portal access for this contact?" label="Revoke" />
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canDelete ? (
              <ClientInviteForm clientId={client.id} />
            ) : (
              <p className="mt-3 text-xs text-text-primary/60">Admins can invite portal users.</p>
            )}
          </div>

          {canDelete && (
            <form action={deleteClientRecord} className="rounded-card border border-error/30 bg-error/5 p-5">
              <input type="hidden" name="id" value={client.id} />
              <p className="section-stamp text-error">DANGER ZONE</p>
              <p className="mt-2 text-sm text-text-primary/75">
                Deleting removes every engagement, deliverable, and report for this client.
              </p>
              <div className="mt-3">
                <ConfirmSubmit message={`Delete ${client.name} and all of their data?`} />
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="mb-8">
        <p className="section-stamp mb-3">ENGAGEMENTS</p>

        <form action={saveEngagement} className="mb-5 rounded-card border border-dashed border-border p-5">
          <input type="hidden" name="client_id" value={client.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label htmlFor="new-engagement-title" className={LABEL}>New engagement</label>
              <input id="new-engagement-title" name="title" required placeholder="Website redesign" className={FIELD} />
            </div>
            <div>
              <label htmlFor="new-engagement-start" className={LABEL}>Start</label>
              <input id="new-engagement-start" name="start_date" type="date" className={FIELD} />
            </div>
            <div>
              <label htmlFor="new-engagement-target" className={LABEL}>Target</label>
              <input id="new-engagement-target" name="target_date" type="date" className={FIELD} />
            </div>
          </div>
          <button type="submit" className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
            Add engagement
          </button>
        </form>

        {engagements.length === 0 ? (
          <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
            No engagements yet.
          </div>
        ) : (
          <div className="space-y-5">
            {engagements.map((engagement) => {
              const theirMilestones = milestones.filter((m) => m.engagement_id === engagement.id);
              const theirDeliverables = deliverables.filter((d) => d.engagement_id === engagement.id);

              return (
                <details key={engagement.id} className="rounded-card border border-border bg-surface" open>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-5">
                    <span className="font-display font-semibold text-ink-900">{engagement.title}</span>
                    <span className="flex items-center gap-3 text-xs">
                      <span className="text-text-primary/60">{engagement.progress}%</span>
                      <span className="rounded-card bg-canvas-warm px-2 py-1 font-mono uppercase text-text-primary/70">
                        {ENGAGEMENT_LABELS[engagement.status]}
                      </span>
                    </span>
                  </summary>

                  <div className="space-y-6 border-t border-border p-5">
                    <form action={saveEngagement} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <input type="hidden" name="id" value={engagement.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <div className="lg:col-span-2">
                        <label htmlFor={`t-${engagement.id}`} className={LABEL}>Title</label>
                        <input id={`t-${engagement.id}`} name="title" required defaultValue={engagement.title} className={SMALL} />
                      </div>
                      <div>
                        <label htmlFor={`s-${engagement.id}`} className={LABEL}>Status</label>
                        <select id={`s-${engagement.id}`} name="status" defaultValue={engagement.status} className={SMALL}>
                          {ENGAGEMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>{ENGAGEMENT_LABELS[status]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`p-${engagement.id}`} className={LABEL}>Progress %</label>
                        <input id={`p-${engagement.id}`} name="progress" type="number" min={0} max={100} defaultValue={engagement.progress} className={SMALL} />
                      </div>
                      <div>
                        <label htmlFor={`sd-${engagement.id}`} className={LABEL}>Start</label>
                        <input id={`sd-${engagement.id}`} name="start_date" type="date" defaultValue={engagement.start_date ?? ""} className={SMALL} />
                      </div>
                      <div>
                        <label htmlFor={`td-${engagement.id}`} className={LABEL}>Target</label>
                        <input id={`td-${engagement.id}`} name="target_date" type="date" defaultValue={engagement.target_date ?? ""} className={SMALL} />
                      </div>
                      <div>
                        <label htmlFor={`l-${engagement.id}`} className={LABEL}>Lead</label>
                        <select id={`l-${engagement.id}`} name="lead_id" defaultValue={engagement.lead_id ?? ""} className={SMALL}>
                          <option value="">Unassigned</option>
                          {staff.map((person) => (
                            <option key={person.id} value={person.id}>{person.display_name ?? person.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`pr-${engagement.id}`} className={LABEL}>Portfolio project</label>
                        <select id={`pr-${engagement.id}`} name="project_id" defaultValue={engagement.project_id ?? ""} className={SMALL}>
                          <option value="">None</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label htmlFor={`sm-${engagement.id}`} className={LABEL}>Summary (shown to client)</label>
                        <textarea id={`sm-${engagement.id}`} name="summary" rows={2} defaultValue={engagement.summary ?? ""} className={SMALL} />
                      </div>
                      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
                        <button type="submit" className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm">
                          Save engagement
                        </button>
                      </div>
                    </form>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <p className="section-stamp">TIMELINE</p>
                        <ul className="mt-3 space-y-2">
                          {theirMilestones.map((milestone) => (
                            <li key={milestone.id} className="rounded-card border border-border p-3">
                              <form action={saveMilestone} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                <input type="hidden" name="id" value={milestone.id} />
                                <input type="hidden" name="engagement_id" value={engagement.id} />
                                <input type="hidden" name="client_id" value={client.id} />
                                <input type="hidden" name="position" value={milestone.position} />
                                <input name="title" defaultValue={milestone.title} className={SMALL} aria-label="Milestone title" />
                                <select name="status" defaultValue={milestone.status} className={SMALL} aria-label="Milestone status">
                                  {MILESTONE_STATUSES.map((status) => (
                                    <option key={status} value={status}>{MILESTONE_LABELS[status]}</option>
                                  ))}
                                </select>
                                <input name="due_date" type="date" defaultValue={milestone.due_date ?? ""} className={SMALL} aria-label="Milestone due date" />
                                <label className="flex items-center gap-2 text-xs text-text-primary/70 sm:col-span-2">
                                  <input name="visible_to_client" type="checkbox" defaultChecked={milestone.visible_to_client} className={CHECKBOX} />
                                  Visible to client
                                </label>
                                <button type="submit" className="rounded-card border border-border px-2 py-1 text-xs hover:bg-canvas-warm">
                                  Save
                                </button>
                              </form>
                              <form action={deleteMilestone} className="mt-2">
                                <input type="hidden" name="id" value={milestone.id} />
                                <input type="hidden" name="client_id" value={client.id} />
                                <ConfirmSubmit message="Delete this milestone?" />
                              </form>
                            </li>
                          ))}
                        </ul>

                        <form action={saveMilestone} className="mt-3 grid gap-2 rounded-card border border-dashed border-border p-3 sm:grid-cols-[1fr_auto]">
                          <input type="hidden" name="engagement_id" value={engagement.id} />
                          <input type="hidden" name="client_id" value={client.id} />
                          <input type="hidden" name="position" value={theirMilestones.length} />
                          <input type="hidden" name="visible_to_client" value="on" />
                          <input name="title" required placeholder="New milestone" className={SMALL} aria-label="New milestone" />
                          <button type="submit" className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm">
                            Add
                          </button>
                        </form>
                      </div>

                      <div>
                        <p className="section-stamp">DELIVERABLES</p>
                        <ul className="mt-3 space-y-2">
                          {theirDeliverables.map((deliverable) => (
                            <li key={deliverable.id} className="rounded-card border border-border p-3">
                              <form action={saveDeliverable} className="grid gap-2 sm:grid-cols-2">
                                <input type="hidden" name="id" value={deliverable.id} />
                                <input type="hidden" name="engagement_id" value={engagement.id} />
                                <input type="hidden" name="client_id" value={client.id} />
                                <input type="hidden" name="position" value={deliverable.position} />
                                <input name="title" defaultValue={deliverable.title} className={SMALL} aria-label="Deliverable title" />
                                <select name="kind" defaultValue={deliverable.kind} className={SMALL} aria-label="Deliverable kind">
                                  {DELIVERABLE_KINDS.map((kind) => (
                                    <option key={kind} value={kind}>{DELIVERABLE_KIND_LABELS[kind]}</option>
                                  ))}
                                </select>
                                <input name="url" defaultValue={deliverable.url ?? ""} placeholder="https://..." className={SMALL} aria-label="Deliverable URL" />
                                <select name="status" defaultValue={deliverable.status} className={SMALL} aria-label="Deliverable status">
                                  {DELIVERABLE_STATUSES.map((status) => (
                                    <option key={status} value={status}>{DELIVERABLE_LABELS[status]}</option>
                                  ))}
                                </select>
                                <input name="version" defaultValue={deliverable.version ?? ""} placeholder="v1" className={SMALL} aria-label="Version" />
                                <input name="due_date" type="date" defaultValue={deliverable.due_date ?? ""} className={SMALL} aria-label="Deliverable due date" />
                                <label className="flex items-center gap-2 text-xs text-text-primary/70 sm:col-span-2">
                                  <input name="visible_to_client" type="checkbox" defaultChecked={deliverable.visible_to_client} className={CHECKBOX} />
                                  Visible to client
                                </label>
                                <button type="submit" className="rounded-card border border-border px-2 py-1 text-xs hover:bg-canvas-warm">
                                  Save
                                </button>
                              </form>
                              {deliverable.client_feedback && (
                                <p className="mt-2 rounded-card bg-canvas-warm p-2 text-xs text-text-primary/75">
                                  Client: {deliverable.client_feedback}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-3">
                                <span className={`rounded-card px-2 py-0.5 font-mono text-[11px] uppercase ${DELIVERABLE_STYLES[deliverable.status]}`}>
                                  {DELIVERABLE_LABELS[deliverable.status]}
                                </span>
                                <form action={deleteDeliverable}>
                                  <input type="hidden" name="id" value={deliverable.id} />
                                  <input type="hidden" name="client_id" value={client.id} />
                                  <ConfirmSubmit message="Delete this deliverable?" />
                                </form>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <form action={saveDeliverable} className="mt-3 grid gap-2 rounded-card border border-dashed border-border p-3 sm:grid-cols-[1fr_auto]">
                          <input type="hidden" name="engagement_id" value={engagement.id} />
                          <input type="hidden" name="client_id" value={client.id} />
                          <input type="hidden" name="position" value={theirDeliverables.length} />
                          <input type="hidden" name="visible_to_client" value="on" />
                          <input name="title" required placeholder="New deliverable" className={SMALL} aria-label="New deliverable" />
                          <button type="submit" className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm">
                            Add
                          </button>
                        </form>
                      </div>
                    </div>

                    <form action={deleteEngagement}>
                      <input type="hidden" name="id" value={engagement.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <ConfirmSubmit message="Delete this engagement and everything under it?" />
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <p className="section-stamp mb-3">REPORTS</p>

        <form action={saveReport} className="mb-5 rounded-card border border-dashed border-border p-5">
          <input type="hidden" name="client_id" value={client.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label htmlFor="report-title" className={LABEL}>Title</label>
              <input id="report-title" name="title" required placeholder="Monthly progress report" className={FIELD} />
            </div>
            <div>
              <label htmlFor="report-start" className={LABEL}>Period start</label>
              <input id="report-start" name="period_start" type="date" className={FIELD} />
            </div>
            <div>
              <label htmlFor="report-end" className={LABEL}>Period end</label>
              <input id="report-end" name="period_end" type="date" className={FIELD} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="report-engagement" className={LABEL}>Engagement</label>
              <select id="report-engagement" name="engagement_id" className={FIELD}>
                <option value="">All work</option>
                {engagements.map((engagement) => (
                  <option key={engagement.id} value={engagement.id}>{engagement.title}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="report-body" className={LABEL}>Body</label>
              <textarea id="report-body" name="body" rows={8} className={`${FIELD} font-mono text-[13px]`} />
              <p className="mt-1 text-xs text-text-primary/60">
                <code># </code> heading · <code>- </code> bullet · blank line for a new paragraph.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-primary/80 sm:col-span-2 lg:col-span-4">
              <input name="published" type="checkbox" className={CHECKBOX} />
              Publish to the client portal
            </label>
          </div>
          <button type="submit" className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
            Save report
          </button>
        </form>

        {reports.length > 0 && (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold text-ink-900">{report.title}</p>
                    <p className="mt-1 text-xs text-text-primary/60">
                      {formatPeriod(report.period_start, report.period_end)}
                    </p>
                  </div>
                  <span
                    className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${
                      report.published ? "bg-success/10 text-success" : "bg-border/50 text-text-primary/70"
                    }`}
                  >
                    {report.published ? "published" : "draft"}
                  </span>
                </div>

                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm text-brand-700">Edit</summary>
                  <form action={saveReport} className="mt-3 grid gap-3">
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="engagement_id" value={report.engagement_id ?? ""} />
                    <input name="title" defaultValue={report.title} className={SMALL} aria-label="Report title" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="period_start" type="date" defaultValue={report.period_start ?? ""} className={SMALL} aria-label="Period start" />
                      <input name="period_end" type="date" defaultValue={report.period_end ?? ""} className={SMALL} aria-label="Period end" />
                    </div>
                    <textarea name="body" rows={8} defaultValue={report.body} className={`${SMALL} font-mono text-[13px]`} aria-label="Report body" />
                    <label className="flex items-center gap-2 text-sm text-text-primary/80">
                      <input name="published" type="checkbox" defaultChecked={report.published} className={CHECKBOX} />
                      Published
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm">
                        Save
                      </button>
                    </div>
                  </form>
                  <form action={deleteReport} className="mt-3">
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <ConfirmSubmit message="Delete this report?" />
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
