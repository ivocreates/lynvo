"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireManager, recordAudit } from "@/lib/auth";
import { CERTIFICATE_TYPES, type CertificateType } from "@/lib/certificates";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const schema = z.object({
  cert_type: z.enum(CERTIFICATE_TYPES as [CertificateType, ...CertificateType[]]).catch("internship"),
  recipient_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null)),
  recipient_name: z.string().trim().min(2).max(160),
  recipient_email: optional(320),
  role_title: optional(160),
  department: optional(120),
  start_date: optional(10),
  end_date: optional(10),
  summary: optional(2000),
  skills: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    ),
});

export async function createCertificate(formData: FormData) {
  await requireManager();

  const parsed = schema.safeParse({
    cert_type: formData.get("cert_type") ?? "internship",
    recipient_id: formData.get("recipient_id") ?? undefined,
    recipient_name: formData.get("recipient_name"),
    recipient_email: formData.get("recipient_email") ?? undefined,
    role_title: formData.get("role_title") ?? undefined,
    department: formData.get("department") ?? undefined,
    start_date: formData.get("start_date") ?? undefined,
    end_date: formData.get("end_date") ?? undefined,
    summary: formData.get("summary") ?? undefined,
    skills: formData.get("skills") ?? undefined,
  });

  if (!parsed.success) return;

  const supabase = createClient();
  const { data } = await supabase.from("certificates").insert(parsed.data).select("id").maybeSingle();

  if (data) await recordAudit("create", "certificates", data.id, { name: parsed.data.recipient_name });

  revalidatePath("/admin/certificates");
}

/** Marks the engagement complete and makes the certificate publicly verifiable. */
export async function issueCertificate(formData: FormData) {
  const actor = await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("certificates")
    .update({
      status: "issued",
      issued_on: new Date().toISOString().slice(0, 10),
      issued_by: actor.id,
      revoked_reason: null,
    })
    .eq("id", id);

  await recordAudit("issue", "certificates", id);

  revalidatePath("/admin/certificates");
  revalidatePath("/staff/documents");
}

export async function revokeCertificate(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = String(formData.get("revoked_reason") ?? "").trim().slice(0, 500) || null;

  const supabase = createClient();
  await supabase.from("certificates").update({ status: "revoked", revoked_reason: reason }).eq("id", id);
  await recordAudit("revoke", "certificates", id, { reason });

  revalidatePath("/admin/certificates");
  revalidatePath("/staff/documents");
}

export async function deleteCertificate(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("certificates").delete().eq("id", id);
  await recordAudit("delete", "certificates", id);

  revalidatePath("/admin/certificates");
}
