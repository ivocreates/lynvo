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
  });
}

export async function createDocument(formData: FormData) {
  const actor = await requireManager();

  const parsed = parse(formData);
  if (!parsed.success) return;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff_documents")
    .insert({ ...parsed.data, created_by: actor.id })
    .select("id")
    .maybeSingle();

  if (error || !data) return;

  await recordAudit("create", "staff_documents", data.id, { title: parsed.data.title });

  revalidatePath("/admin/documents");
  redirect(`/admin/documents/${data.id}`);
}

export async function updateDocument(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = parse(formData);
  if (!parsed.success) return;

  const supabase = createClient();
  await supabase.from("staff_documents").update(parsed.data).eq("id", id);
  await recordAudit("update", "staff_documents", id);

  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/staff/documents");
}

export async function setDocumentStatus(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !DOC_STATUSES.includes(status as DocStatus)) return;

  const supabase = createClient();
  await supabase.from("staff_documents").update({ status }).eq("id", id);
  await recordAudit("status_change", "staff_documents", id, { status });

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/staff/documents");
}

export async function deleteDocument(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_documents").delete().eq("id", id);
  await recordAudit("delete", "staff_documents", id);

  revalidatePath("/admin/documents");
  redirect("/admin/documents");
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
