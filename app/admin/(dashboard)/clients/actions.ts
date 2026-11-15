"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/server";
import { requirePermission, requireAdmin, recordAudit } from "@/lib/auth";
import { provisionAccount } from "@/lib/admin/invites";
import { deleteLogin } from "@/lib/accounts-auth";
import { deleteFile } from "@/lib/storage";
import { RELEASE_RULES } from "@/lib/deliverables";
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
  const actor = await requirePermission("clients.manage");

  const parsed = readClient(formData);
  if (!parsed.success) return;

  const db = createClient();
  const { data } = await db
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
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const parsed = readClient(formData);
  if (!id || !parsed.success) return;

  const db = createClient();
  await db.from("clients").update(parsed.data).eq("id", id);
  await recordAudit("update", "clients", id);

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/client");
}

/**
 * Permanently removes a client: their portal logins, projects, deliverables
 * (and uploaded files), reports and agreements. Quotes, invoices and payments
 * are kept for the accounts, unlinked from the deleted client.
 */
export async function deleteClientRecord(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id || String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect(`/admin/clients/${id}?error=${encodeURIComponent("Type DELETE to confirm.")}`);
  }

  const system = createAdminClient();
  const [{ data: users }, { data: engagements }] = await Promise.all([
    system.from("profiles").select("id").eq("client_id", id).eq("role", "client"),
    system.from("client_engagements").select("id").eq("client_id", id),
  ]);
  const engagementIds = ((engagements ?? []) as { id: string }[]).map((row) => row.id);
  const { data: files } = engagementIds.length
    ? await system.from("client_deliverables").select("file_key").in("engagement_id", engagementIds)
    : { data: [] };

  for (const user of (users ?? []) as { id: string }[]) await deleteLogin(user.id).catch(() => undefined);
  for (const file of (files ?? []) as { file_key: string | null }[]) {
    if (file.file_key) await deleteFile(file.file_key).catch(() => undefined);
  }

  await createClient().from("clients").delete().eq("id", id);
  await recordAudit("delete", "clients", id, { logins: (users ?? []).length });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?deleted=1");
}

/** Archive: hides the client from lists and switches off their portal logins. Reversible. */
export async function archiveClient(formData: FormData) {
  await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const restore = formData.get("restore") === "1";
  if (!id) return;

  const db = createClient();
  await db.from("clients").update({ status: restore ? "active" : "archived" }).eq("id", id);
  await createAdminClient().from("profiles").update({ is_active: restore }).eq("client_id", id).eq("role", "client");
  await recordAudit(restore ? "restore" : "archive", "clients", id);

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}?saved=${restore ? "restored" : "archived"}`);
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
  await requirePermission("clients.manage");

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

  const db = createClient();
  const values = {
    ...parsed.data,
    delivered_at: parsed.data.status === "delivered" ? new Date().toISOString() : null,
  };

  if (id) {
    await db.from("client_engagements").update(values).eq("id", id);
  } else {
    await db.from("client_engagements").insert({ ...values, client_id: clientId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteEngagement(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const db = createClient();
  // Uploaded files live in R2, outside the cascade: remove them first.
  const { data: files } = await db.from("client_deliverables").select("file_key").eq("engagement_id", id);
  for (const file of (files ?? []) as { file_key: string | null }[]) {
    if (file.file_key) await deleteFile(file.file_key).catch(() => undefined);
  }
  await db.from("client_engagements").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function saveMilestone(formData: FormData) {
  await requirePermission("clients.manage");

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

  const db = createClient();
  if (id) {
    await db.from("client_milestones").update(values).eq("id", id);
  } else {
    await db.from("client_milestones").insert({ ...values, engagement_id: engagementId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteMilestone(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const db = createClient();
  await db.from("client_milestones").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Deliverables
// ---------------------------------------------------------------------------

export async function saveDeliverable(formData: FormData) {
  await requirePermission("clients.manage");

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
    ...(formData.has("release_rule")
      ? {
          release_rule: (RELEASE_RULES.map((rule) => rule.value) as string[]).includes(String(formData.get("release_rule")))
            ? String(formData.get("release_rule"))
            : "after_all_paid",
          invoice_id: /^[0-9a-f-]{36}$/i.test(String(formData.get("invoice_id") ?? "")) ? String(formData.get("invoice_id")) : null,
        }
      : {}),
  };

  const db = createClient();
  if (id) {
    await db.from("client_deliverables").update(values).eq("id", id);
  } else {
    await db.from("client_deliverables").insert({ release_rule: "after_all_paid", ...values, engagement_id: engagementId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function setDeliverableRelease(formData: FormData) {
  await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;
  const release = formData.get("release") === "1";
  await createClient().from("client_deliverables").update({ released_at: release ? new Date().toISOString() : null }).eq("id", id);
  await recordAudit(release ? "release" : "lock", "client_deliverables", id);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/files");
}

export async function removeDeliverableFile(formData: FormData) {
  await requirePermission("clients.manage");
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;
  const db = createClient();
  const { data } = await db.from("client_deliverables").select("file_key").eq("id", id).maybeSingle();
  if (data?.file_key) await deleteFile(String(data.file_key)).catch(() => undefined);
  await db.from("client_deliverables").update({ file_key: null, file_name: null, file_size: null, file_type: null }).eq("id", id);
  await recordAudit("remove_file", "client_deliverables", id);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteDeliverable(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const db = createClient();
  const { data: existing } = await db.from("client_deliverables").select("file_key").eq("id", id).maybeSingle();
  if (existing?.file_key) await deleteFile(String(existing.file_key)).catch(() => undefined);
  await db.from("client_deliverables").delete().eq("id", id);

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function saveReport(formData: FormData) {
  const actor = await requirePermission("clients.manage");

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

  const db = createClient();
  if (id) {
    await db.from("client_reports").update(values).eq("id", id);
  } else {
    await db.from("client_reports").insert({ ...values, client_id: clientId, created_by: actor.id });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client");
}

export async function deleteReport(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;

  const db = createClient();
  await db.from("client_reports").delete().eq("id", id);

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

  if (formData.get("remove") === "1") {
    await deleteLogin(profileId).catch(() => undefined);
    await recordAudit("delete_login", "profiles", profileId, { clientId });
  } else {
    const db = createClient();
    await db.from("profiles").update({ is_active: formData.get("restore") === "1" }).eq("id", profileId);
    await recordAudit(formData.get("restore") === "1" ? "restore_access" : "revoke_access", "profiles", profileId, { clientId });
  }

  revalidatePath(`/admin/clients/${clientId}`);
}
