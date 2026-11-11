"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requirePermission, recordAudit } from "@/lib/auth";
import { addDays, todayIso } from "@/lib/admin/billing";
import {
  ACTIVITY_KINDS,
  ACTIVITY_OUTCOMES,
  LEAD_INTERESTS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  parseLeadCsv,
} from "@/lib/crm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const oneOf = (value: string, options: readonly { value: string }[], fallback: string) =>
  options.some((option) => option.value === value) ? value : fallback;

function text(formData: FormData, field: string, max = 500) {
  return String(formData.get(field) ?? "").trim().slice(0, max) || null;
}

function back(formData: FormData, fallback: string) {
  const target = String(formData.get("redirect_to") ?? "");
  return target.startsWith("/admin/") ? target : fallback;
}

function flag(path: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${value}`;
}

function revalidateCrm(id?: string) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/leads");
  if (id) revalidatePath(`/admin/crm/leads/${id}`);
}

function leadValues(formData: FormData) {
  const value = Number(formData.get("estimated_value") ?? "");
  const followUp = text(formData, "next_follow_up", 10);
  return {
    company: String(formData.get("company") ?? "").trim().slice(0, 200),
    contact_name: text(formData, "contact_name", 120),
    designation: text(formData, "designation", 120),
    email: text(formData, "email", 320),
    phone: text(formData, "phone", 40),
    website: text(formData, "website", 300),
    social_url: text(formData, "social_url", 300),
    industry: text(formData, "industry", 120),
    city: text(formData, "city", 120),
    site: formData.get("site") === "tech" ? "tech" : "studio",
    source: oneOf(String(formData.get("source") ?? ""), LEAD_SOURCES, "cold_call"),
    priority: oneOf(String(formData.get("priority") ?? ""), LEAD_PRIORITIES, "medium"),
    interests: formData.getAll("interests").map(String).filter((entry) => LEAD_INTERESTS.includes(entry)),
    estimated_value: Number.isFinite(value) && value > 0 ? value : null,
    next_follow_up: followUp && /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
    notes: text(formData, "notes", 4000),
    research_notes: text(formData, "research_notes", 8000),
  };
}

export async function createLead(formData: FormData) {
  const actor = await requirePermission("crm");
  const target = back(formData, "/admin/crm/leads");

  const values = leadValues(formData);
  if (values.company.length < 2) redirect(flag(target, `error=${encodeURIComponent("Add the business name.")}`));

  const supabase = createClient();

  // Avoid calling the same business twice: match on phone first, then name.
  if (values.phone) {
    const digits = values.phone.replace(/\D/g, "").slice(-10);
    if (digits.length >= 8) {
      const { data: duplicate } = await supabase.from("crm_leads").select("id").ilike("phone", `%${digits}%`).limit(1).maybeSingle();
      if (duplicate) redirect(`/admin/crm/leads/${(duplicate as { id: string }).id}?duplicate=1`);
    }
  }

  const ownerId = String(formData.get("owner_id") ?? "");
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({ ...values, owner_id: UUID.test(ownerId) ? ownerId : actor.id, created_by: actor.id })
    .select("id")
    .maybeSingle();

  if (error || !data) redirect(flag(target, `error=${encodeURIComponent("Could not add the lead. Has migration 0030 been run?")}`));

  await recordAudit("create", "crm_leads", (data as { id: string }).id, { company: values.company });
  revalidateCrm();
  redirect(`/admin/crm/leads/${(data as { id: string }).id}?created=1`);
}

export async function updateLead(formData: FormData) {
  await requirePermission("crm");

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const values = leadValues(formData);
  if (values.company.length < 2) redirect(`/admin/crm/leads/${id}?error=${encodeURIComponent("Add the business name.")}`);

  const ownerId = String(formData.get("owner_id") ?? "");
  const supabase = createClient();
  const { error } = await supabase
    .from("crm_leads")
    .update({ ...values, owner_id: UUID.test(ownerId) ? ownerId : null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect(`/admin/crm/leads/${id}?error=${encodeURIComponent("Could not save the lead.")}`);
  revalidateCrm(id);
  redirect(`/admin/crm/leads/${id}?saved=1`);
}

export async function setLeadStatus(formData: FormData) {
  const actor = await requirePermission("crm");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const target = back(formData, `/admin/crm/leads/${id}`);
  if (!UUID.test(id) || !LEAD_STATUSES.some((entry) => entry.value === status)) return;

  const supabase = createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "lost") updates.lost_reason = text(formData, "lost_reason", 300);
  if (status === "won" || status === "lost") updates.next_follow_up = null;

  const { error } = await supabase.from("crm_leads").update(updates).eq("id", id);
  if (!error) {
    await supabase.from("crm_activities").insert({
      lead_id: id,
      kind: "status",
      summary: `Moved to ${status.replace("_", " ")}`,
      created_by: actor.id,
    });
  }

  revalidateCrm(id);
  redirect(flag(target, error ? "error=status" : "saved=1"));
}

export async function logActivity(formData: FormData) {
  const actor = await requirePermission("crm");

  const leadId = String(formData.get("lead_id") ?? "");
  const target = back(formData, `/admin/crm/leads/${leadId}`);
  if (!UUID.test(leadId)) return;

  const kind = oneOf(String(formData.get("kind") ?? "call"), ACTIVITY_KINDS, "call");
  const outcomeRaw = String(formData.get("outcome") ?? "");
  const outcome = ACTIVITY_OUTCOMES.some((entry) => entry.value === outcomeRaw) ? outcomeRaw : null;

  let followUp = text(formData, "follow_up_on", 10);
  const followUpDays = Number(formData.get("follow_up_days") ?? "");
  if (!followUp && Number.isFinite(followUpDays) && followUpDays > 0) followUp = addDays(todayIso(), followUpDays);

  const supabase = createClient();
  const { error } = await supabase.from("crm_activities").insert({
    lead_id: leadId,
    kind,
    outcome,
    summary: text(formData, "summary", 4000),
    duration_minutes: Number(formData.get("duration_minutes") ?? "") || null,
    follow_up_on: followUp && /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
    created_by: actor.id,
  });

  // "Not interested" and "wrong number" close the lead so it leaves the call list.
  if (!error && (outcome === "not_interested" || outcome === "wrong_number")) {
    await supabase
      .from("crm_leads")
      .update({ status: "lost", lost_reason: outcome === "wrong_number" ? "Wrong number" : "Not interested", next_follow_up: null })
      .eq("id", leadId);
  }

  revalidateCrm(leadId);
  redirect(flag(target, error ? `error=${encodeURIComponent("Could not log that.")}` : "logged=1"));
}

/** Creates (or links) a client account for a won lead, optionally jumping to a new quote. */
export async function convertLead(formData: FormData) {
  const actor = await requirePermission("crm");

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "lead");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const { data: row } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
  if (!row) redirect("/admin/crm/leads?error=missing");
  const lead = row as Record<string, any>;

  let clientId: string | null = lead.client_id;
  if (!clientId) {
    const { data: existing } = await supabase.from("clients").select("id").ilike("name", lead.company).limit(1).maybeSingle();
    clientId = (existing as { id: string } | null)?.id ?? null;
  }
  if (!clientId) {
    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        name: lead.company,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        industry: lead.industry,
        region: lead.country && lead.country !== "India" ? "INT" : "IN",
        notes: [lead.notes, lead.research_notes].filter(Boolean).join("\n\n") || null,
        created_by: actor.id,
      })
      .select("id")
      .maybeSingle();
    if (error || !created) redirect(`/admin/crm/leads/${id}?error=${encodeURIComponent("Could not create the client account.")}`);
    clientId = (created as { id: string }).id;
  }

  await supabase
    .from("crm_leads")
    .update({ client_id: clientId, status: next === "quote" && lead.status !== "won" ? "proposal" : "won", next_follow_up: null })
    .eq("id", id);

  await recordAudit("convert", "crm_leads", id, { client: clientId });
  revalidateCrm(id);
  revalidatePath("/admin/clients");

  if (next === "quote") redirect(`/admin/billing/new?type=quote&client=${clientId}`);
  redirect(`/admin/crm/leads/${id}?converted=1`);
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = createClient();
  await supabase.from("crm_leads").delete().eq("id", id);
  revalidateCrm();
  redirect("/admin/crm/leads?deleted=1");
}

/** Bulk import from a pasted CSV / spreadsheet (e.g. a Google Maps research list). */
export async function importLeads(formData: FormData) {
  const actor = await requirePermission("crm");

  const rows = parseLeadCsv(String(formData.get("csv") ?? "").slice(0, 200_000))
    .filter((row) => row.company.length >= 2)
    .slice(0, 500);
  if (rows.length === 0) redirect(`/admin/crm/leads?error=${encodeURIComponent("No rows found. Include a header row with at least a company column.")}`);

  const source = oneOf(String(formData.get("source") ?? ""), LEAD_SOURCES, "google_maps");
  const site = formData.get("site") === "tech" ? "tech" : "studio";

  const supabase = createClient();
  const { data: existing } = await supabase.from("crm_leads").select("phone, company");
  const knownPhones = new Set(
    ((existing ?? []) as { phone: string | null }[]).map((row) => (row.phone ?? "").replace(/\D/g, "").slice(-10)).filter(Boolean)
  );
  const knownNames = new Set(((existing ?? []) as { company: string }[]).map((row) => row.company.trim().toLowerCase()));

  const fresh = rows.filter((row) => {
    const digits = row.phone.replace(/\D/g, "").slice(-10);
    if (digits && knownPhones.has(digits)) return false;
    if (knownNames.has(row.company.trim().toLowerCase())) return false;
    if (digits) knownPhones.add(digits);
    knownNames.add(row.company.trim().toLowerCase());
    return true;
  });

  if (fresh.length > 0) {
    const { error } = await supabase.from("crm_leads").insert(
      fresh.map((row) => ({
        company: row.company.slice(0, 200),
        contact_name: row.contact_name || null,
        phone: row.phone || null,
        email: row.email || null,
        website: row.website || null,
        city: row.city || null,
        industry: row.industry || null,
        notes: row.notes || null,
        source,
        site,
        owner_id: actor.id,
        created_by: actor.id,
      }))
    );
    if (error) redirect(`/admin/crm/leads?error=${encodeURIComponent("Import failed. Check the file and try again.")}`);
  }

  await recordAudit("import", "crm_leads", null, { imported: fresh.length, skipped: rows.length - fresh.length });
  revalidateCrm();
  redirect(`/admin/crm/leads?imported=${fresh.length}&skipped=${rows.length - fresh.length}`);
}

/** Turns a website enquiry into a lead. */
export async function leadFromContact(formData: FormData) {
  const actor = await requirePermission("crm");

  const contactId = String(formData.get("contact_id") ?? "");
  if (!UUID.test(contactId)) return;

  const supabase = createClient();
  const { data: contact } = await supabase.from("contacts").select("*").eq("id", contactId).maybeSingle();
  if (!contact) redirect("/admin/contacts?error=missing");
  const c = contact as Record<string, any>;

  const { data: existing } = await supabase.from("crm_leads").select("id").eq("contact_id", contactId).maybeSingle();
  if (existing) redirect(`/admin/crm/leads/${(existing as { id: string }).id}`);

  const { data } = await supabase
    .from("crm_leads")
    .insert({
      company: c.company || c.name || "Website enquiry",
      contact_name: c.name ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      source: "website",
      status: "new",
      priority: "high",
      notes: [c.service ? `Interested in: ${c.service}` : null, c.budget ? `Budget: ${c.budget}` : null, c.message].filter(Boolean).join("\n"),
      contact_id: contactId,
      owner_id: actor.id,
      next_follow_up: todayIso(),
      created_by: actor.id,
    })
    .select("id")
    .maybeSingle();

  await supabase.from("contacts").update({ status: "read" }).eq("id", contactId);
  revalidateCrm();
  revalidatePath("/admin/contacts");
  redirect(data ? `/admin/crm/leads/${(data as { id: string }).id}?created=1` : "/admin/contacts?error=lead");
}
