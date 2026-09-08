"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireManager, recordAudit } from "@/lib/auth";
import { HR_DOCUMENT_SETTING_KEYS } from "@/lib/admin/billing";
import { DOC_AUDIENCES, DOC_STATUSES, DOC_TYPES, type DocAudience, type DocStatus, type DocType } from "@/lib/documents";

export type DocumentSettingsState = { ok: boolean; message: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  doc_type: z.enum(DOC_TYPES as [DocType, ...DocType[]]).catch("contract"),
  audience: z.enum(DOC_AUDIENCES as [DocAudience, ...DocAudience[]]).catch("individual"),
  reference: optional(80),
  body: z.string().max(60_000),
  recipient_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null)),
  issue_date: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || new Date().toISOString().slice(0, 10)),
  effective_from: optional(10),
  effective_to: optional(10),
  signature_required: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    doc_type: formData.get("doc_type") ?? "contract",
    audience: formData.get("audience") ?? "individual",
    reference: formData.get("reference") ?? undefined,
    body: formData.get("body") ?? "",
    recipient_id: formData.get("recipient_id") ?? undefined,
    issue_date: formData.get("issue_date") ?? undefined,
    effective_from: formData.get("effective_from") ?? undefined,
    effective_to: formData.get("effective_to") ?? undefined,
    signature_required: formData.get("signature_required") ?? undefined,
  });
}

/** References carry a unique index; bump the trailing number so a clash still saves. */
function bumpReference(reference: string | null, attempt: number) {
  if (!reference) return null;
  const match = reference.match(/^(.*?)(\d+)$/);
  if (!match) return `${reference}-${attempt + 1}`;
  const [, prefix, digits] = match;
  return `${prefix}${String(Number(digits) + attempt).padStart(digits.length, "0")}`;
}

function failure(target: string, message: string): never {
  redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function createDocument(formData: FormData) {
  const actor = await requireManager();

  const parsed = parse(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    failure("/admin/documents/new", `${issue.path.join(".") || "Form"}: ${issue.message}`);
  }

  const supabase = createClient();
  const values = parsed.data;
  let created: { id: string } | null = null;
  let message = "Could not create the document.";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("staff_documents")
      .insert({
        ...values,
        reference: attempt === 0 ? values.reference : bumpReference(values.reference, attempt),
        created_by: actor.id,
      })
      .select("id")
      .maybeSingle();

    if (data) {
      created = data as { id: string };
      break;
    }

    message = error?.message ?? message;
    // 23505 = the reference already exists; anything else will not resolve by retrying.
    if (error?.code !== "23505" || !values.reference) break;
  }

  if (!created) failure("/admin/documents/new", message);

  await recordAudit("create", "staff_documents", created.id, { title: values.title });

  revalidatePath("/admin/documents");
  redirect(`/admin/documents/${created.id}?saved=1`);
}

export async function updateDocument(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = parse(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    failure(`/admin/documents/${id}`, `${issue.path.join(".") || "Form"}: ${issue.message}`);
  }

  const supabase = createClient();
  const { error } = await supabase.from("staff_documents").update(parsed.data).eq("id", id);

  if (error) failure(`/admin/documents/${id}`, error.message);

  await recordAudit("update", "staff_documents", id);

  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/staff/documents");
  redirect(`/admin/documents/${id}?saved=1`);
}

export async function setDocumentStatus(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? `/admin/documents/${id}`);

  if (!id || !DOC_STATUSES.includes(status as DocStatus)) return;

  const supabase = createClient();
  const updates: Record<string, unknown> = { status };
  // Re-issuing clears any earlier signature so the recipient must sign the current version.
  if (status === "issued") {
    updates.recipient_signature_url = null;
    updates.recipient_signed_at = null;
  }
  const { error } = await supabase.from("staff_documents").update(updates).eq("id", id);

  if (error) redirect(`${redirectTo}?error=status`);

  await recordAudit("status_change", "staff_documents", id, { status });

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/staff/documents");
  redirect(`${redirectTo}?saved=1`);
}

export async function deleteDocument(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from("staff_documents").delete().eq("id", id);

  if (error) redirect(`/admin/documents?error=delete`);

  await recordAudit("delete", "staff_documents", id);

  revalidatePath("/admin/documents");
  redirect("/admin/documents?deleted=1");
}

export async function saveDocumentSettings(
  _prev: DocumentSettingsState,
  formData: FormData
): Promise<DocumentSettingsState> {
  await requireManager();

  const supabase = createClient();
  const rows = HR_DOCUMENT_SETTING_KEYS.map((key) => ({
    key,
    value: { text: String(formData.get(key) ?? "").trim() },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) return { ok: false, message: "Could not save document formatting." };

  await recordAudit("update", "site_settings", null, { scope: "hr_documents" });
  revalidatePath("/admin/documents");
  revalidatePath("/admin/print/document/[id]", "page");
  revalidatePath("/staff/documents");

  return { ok: true, message: "Document formatting saved." };
}
