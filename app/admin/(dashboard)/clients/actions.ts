"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, requireAdmin, recordAudit } from "@/lib/auth";
import { provisionAccount } from "@/lib/admin/invites";
import { getSiteUrl } from "@/lib/env";
import {
  CLIENT_STATUSES,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  ENGAGEMENT_STATUSES,
  MILESTONE_STATUSES,
  type ClientStatus,
  type DeliverableKind,
  type DeliverableStatus,
  type EngagementStatus,
  type MilestoneStatus,
} from "@/lib/clients";

export type ClientState = { ok: boolean; message: string; link?: string | null };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const uuidOrNull = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null));

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contact_name: optional(120),
  email: optional(320),
  phone: optional(40),
  website: optional(200),
  address: optional(400),
  logo_url: optional(500),
  status: z.enum(CLIENT_STATUSES as [ClientStatus, ...ClientStatus[]]).catch("active"),
  notes: optional(4000),
});

function readClient(formData: FormData) {
  return clientSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    website: formData.get("website") ?? undefined,
    address: formData.get("address") ?? undefined,
    logo_url: formData.get("logo_url") ?? undefined,
    status: formData.get("status") ?? "active",
    notes: formData.get("notes") ?? undefined,
  });
}

export async function createClientRecord(formData: FormData) {
  const actor = await requireStaff();

  const parsed = readClient(formData);
  if (!parsed.success) return;

  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .insert({ ...parsed.data, created_by: actor.id })
    .select("id")
    .maybeSingle();

  if (!data) return;

  await recordAudit("create", "clients", data.id, { name: parsed.data.name });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${data.id}`);
}

export async function updateClientRecord(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const parsed = readClient(formData);
  if (!id || !parsed.success) return;

  const supabase = createClient();
  await supabase.from("clients").update(parsed.data).eq("id", id);
  await recordAudit("update", "clients", id);

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/client");
}

export async function deleteClientRecord(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("clients").delete().eq("id", id);
  await recordAudit("delete", "clients", id);

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

// ---------------------------------------------------------------------------
// Engagements
// ---------------------------------------------------------------------------

const engagementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  summary: optional(2000),
  status: z.enum(ENGAGEMENT_STATUSES as [EngagementStatus, ...EngagementStatus[]]).catch("discovery"),
  progress: z.coerce.number().min(0).max(100).catch(0),
  start_date: optional(10),
  target_date: optional(10),
  lead_id: uuidOrNull,
  project_id: uuidOrNull,
});

export async function saveEngagement(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const parsed = engagementSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") ?? undefined,
    status: formData.get("status") ?? "discovery",
    progress: formData.get("progress") ?? 0,
    start_date: formData.get("start_date") ?? undefined,
    target_date: formData.get("target_date") ?? undefined,
    lead_id: formData.get("lead_id") ?? undefined,
    project_id: formData.get("project_id") ?? undefined,
  });

  if (!parsed.success) return;

  const supabase = createClient();
  const values = {
    ...parsed.data,
    delivered_at: parsed.data.status === "delivered" ? new Date().toISOString() : null,
  };

  if (id) {
    await supabase.from("client_engagements").update(values).eq("id", id);
  } else {
    await supabase.from("client_engagements").insert({ ...values, client_id: clientId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteEngagement(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("client_engagements").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function saveMilestone(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const engagementId = String(formData.get("engagement_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "planned");

  if (!engagementId || !title) return;

  const values = {
    title: title.slice(0, 200),
    description: String(formData.get("description") ?? "").trim().slice(0, 2000) || null,
    status: (MILESTONE_STATUSES as string[]).includes(status) ? (status as MilestoneStatus) : "planned",
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    position: Number(formData.get("position") ?? 0) || 0,
    visible_to_client: formData.get("visible_to_client") === "on",
    completed_at: status === "done" ? new Date().toISOString() : null,
  };

  const supabase = createClient();
  if (id) {
    await supabase.from("client_milestones").update(values).eq("id", id);
  } else {
    await supabase.from("client_milestones").insert({ ...values, engagement_id: engagementId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteMilestone(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("client_milestones").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Deliverables
// ---------------------------------------------------------------------------

export async function saveDeliverable(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const engagementId = String(formData.get("engagement_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "preview");
  const status = String(formData.get("status") ?? "pending");

  if (!engagementId || !title) return;

  const values = {
    title: title.slice(0, 200),
    description: String(formData.get("description") ?? "").trim().slice(0, 2000) || null,
    kind: (DELIVERABLE_KINDS as string[]).includes(kind) ? (kind as DeliverableKind) : "preview",
    url: String(formData.get("url") ?? "").trim().slice(0, 500) || null,
    version: String(formData.get("version") ?? "").trim().slice(0, 40) || null,
    status: (DELIVERABLE_STATUSES as string[]).includes(status)
      ? (status as DeliverableStatus)
      : "pending",
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    visible_to_client: formData.get("visible_to_client") === "on",
    position: Number(formData.get("position") ?? 0) || 0,
    delivered_at: status === "delivered" ? new Date().toISOString() : null,
  };

  const supabase = createClient();
  if (id) {
    await supabase.from("client_deliverables").update(values).eq("id", id);
  } else {
    await supabase.from("client_deliverables").insert({ ...values, engagement_id: engagementId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteDeliverable(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("client_deliverables").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function saveReport(formData: FormData) {
  const actor = await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!clientId || !title) return;

  const published = formData.get("published") === "on";

  const values = {
    title: title.slice(0, 200),
    engagement_id:
      uuidOrNull.parse(String(formData.get("engagement_id") ?? "") || undefined) ?? null,
    period_start: String(formData.get("period_start") ?? "").trim() || null,
    period_end: String(formData.get("period_end") ?? "").trim() || null,
    body: String(formData.get("body") ?? "").slice(0, 40_000),
    published,
    published_at: published ? new Date().toISOString() : null,
  };

  const supabase = createClient();
  if (id) {
    await supabase.from("client_reports").update(values).eq("id", id);
  } else {
    await supabase.from("client_reports").insert({ ...values, client_id: clientId, created_by: actor.id });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteReport(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("client_reports").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Portal access
// ---------------------------------------------------------------------------

/** Invites a client contact and links their profile to this client. */
export async function inviteClientUser(_prev: ClientState, formData: FormData): Promise<ClientState> {
  await requireAdmin();

  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!clientId) return { ok: false, message: "Missing client." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const result = await provisionAccount({
    email,
    password: password || null,
    next: "/admin/update-password",
    subject: "Your LYNVO client portal access",
    intro:
      "You have been given access to the LYNVO client portal, where you can follow project progress, deliverables, reports and quotes.",
  });

  if (!result.ok) return { ok: false, message: result.message };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "client", is_active: true, client_id: clientId })
    .eq("id", result.userId);

  if (error) {
    return { ok: false, message: "The account exists but could not be linked to this client." };
  }

  await recordAudit("invite", "clients", clientId, { email });
  revalidatePath(`/admin/clients/${clientId}`);

  if (!result.link) {
    return {
      ok: true,
      message: `Portal access ready for ${email}. Share the password you just set.`,
      link: null,
    };
  }

  return {
    ok: true,
    message: result.emailed
      ? `Portal invite emailed to ${email}. The link below works too.`
      : `Portal invite link created for ${email}. Email delivery is unavailable, so send this link yourself.`,
    link: result.link,
  };
}

export async function revokeClientUser(formData: FormData) {
  await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!profileId) return;

  const supabase = createClient();
  await supabase.from("profiles").update({ is_active: false }).eq("id", profileId);
  await recordAudit("revoke_access", "profiles", profileId, { clientId });

  revalidatePath(`/admin/clients/${clientId}`);
}
