"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requirePermission, recordAudit } from "@/lib/auth";
import { formatFieldValues, getTemplate, renderTemplate } from "@/lib/legal-templates";
import { clientValues, companyValues, readFieldValues } from "@/lib/legal-autofill";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

async function nextReference(supabase: ReturnType<typeof createClient>) {
  const [{ data: prefixRow }, { data: latest }] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "legal_reference_prefix").maybeSingle(),
    supabase
      .from("client_agreements")
      .select("reference")
      .not("reference", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const prefix = ((prefixRow as { value: { text?: string } | null } | null)?.value?.text || "LYNVO/LGL").replace(/\/+$/, "");
  const last = Number(String((latest as { reference?: string } | null)?.reference ?? "").match(/(\d+)$/)?.[1] ?? 0);
  return `${prefix}/${new Date().getFullYear()}/${String(last + 1).padStart(3, "0")}`;
}

export async function createAgreement(formData: FormData) {
  const actor = await requirePermission("clients.manage");

  const templateKey = String(formData.get("template") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const engagementId = String(formData.get("engagement_id") ?? "");
  const quoteId = String(formData.get("quote_id") ?? "");
  const back = `/admin/legal/new?template=${encodeURIComponent(templateKey)}&client=${clientId}`;

  const template = getTemplate(templateKey);
  if (!template || template.audience !== "client") fail("/admin/legal/new", "Choose a template.");
  if (!UUID.test(clientId)) fail("/admin/legal/new", "Choose a client.");

  const [company, client] = await Promise.all([
    companyValues(),
    clientValues(clientId, UUID.test(engagementId) ? engagementId : null, UUID.test(quoteId) ? quoteId : null),
  ]);
  if (!client) fail("/admin/legal/new", "Client not found.");

  const raw = readFieldValues(template!, formData);
  const missing = template!.fields.find((field) => field.required && !raw[field.key]);
  if (missing) fail(back, `${missing.label} is required.`);

  const body = renderTemplate(template!.body, { ...company, ...client!.party, ...formatFieldValues(template!, raw) });

  const supabase = createClient();
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const { data, error } = await supabase
      .from("client_agreements")
      .insert({
        client_id: clientId,
        engagement_id: UUID.test(engagementId) ? engagementId : null,
        template_key: template!.key,
        title: `${template!.title}${raw.project_title ? ` — ${raw.project_title}` : ""}`,
        reference: await nextReference(supabase),
        body,
        field_values: raw,
        signature_required: template!.signature,
        created_by: actor.id,
      })
      .select("id")
      .maybeSingle();
    if (data) created = data as { id: string };
    else if (error?.code !== "23505") fail(back, error?.message.includes("row-level") ? "You do not have permission." : "Could not create the agreement. Has migration 0029 been run?");
  }
  if (!created) fail(back, "Could not allocate a reference number.");

  await recordAudit("create", "client_agreements", created!.id, { template: template!.key });
  revalidatePath("/admin/legal");
  revalidatePath(`/admin/clients/${clientId}/legal`);
  redirect(`/admin/legal/${created!.id}?created=1`);
}

export async function updateAgreement(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").slice(0, 80_000);
  if (title.length < 2) fail(`/admin/legal/${id}`, "Title is required.");

  const supabase = createClient();
  const { error } = await supabase
    .from("client_agreements")
    .update({
      title,
      body,
      reference: String(formData.get("reference") ?? "").trim() || null,
      issue_date: String(formData.get("issue_date") ?? "") || new Date().toISOString().slice(0, 10),
      signature_required: formData.get("signature_required") === "on",
    })
    .eq("id", id);
  if (error) fail(`/admin/legal/${id}`, "Could not save. Signed agreements cannot be edited.");

  await recordAudit("update", "client_agreements", id);
  revalidatePath(`/admin/legal/${id}`);
  redirect(`/admin/legal/${id}?saved=1`);
}

export async function setAgreementStatus(formData: FormData) {
  await requirePermission("clients.manage");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(id) || !["draft", "sent", "void", "signed"].includes(status)) return;

  const supabase = createClient();
  const { data: row } = await supabase.from("client_agreements").select("client_id, status, signature_required").eq("id", id).maybeSingle();
  const current = row as { client_id: string; status: string; signature_required: boolean } | null;
  if (!current) fail("/admin/legal", "Agreement not found.");

  // "signed" by hand is only for documents that do not need the client's portal signature.
  if (status === "signed" && current!.signature_required) fail(`/admin/legal/${id}`, "The client signs this in their portal.");

  const { error } = await supabase.from("client_agreements").update({ status }).eq("id", id);
  if (error) fail(`/admin/legal/${id}`, "Could not change the status.");

  await recordAudit("status_change", "client_agreements", id, { status });
  revalidatePath("/admin/legal");
  revalidatePath(`/admin/legal/${id}`);
  revalidatePath("/client/documents");
  revalidatePath(`/admin/clients/${current!.client_id}/legal`);
  redirect(`/admin/legal/${id}?saved=1`);
}

export async function deleteAgreement(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  await supabase.from("client_agreements").delete().eq("id", id);
  await recordAudit("delete", "client_agreements", id);
  revalidatePath("/admin/legal");
  redirect("/admin/legal?deleted=1");
}
