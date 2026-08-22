"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireManager, recordAudit } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { CERTIFICATE_SETTING_KEYS } from "@/lib/admin/billing";
import {
  CERTIFICATE_TYPES,
  certificatePrintUrl,
  verifyUrl,
  type Certificate,
  type CertificateType,
} from "@/lib/certificates";

export type CertificateSettingsState = { ok: boolean; message: string };

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
  let certificateData = parsed.data;

  if (parsed.data.recipient_id) {
    const { data: person } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", parsed.data.recipient_id)
      .maybeSingle();

    if (person?.display_name?.trim()) {
      certificateData = { ...parsed.data, recipient_name: person.display_name.trim() };
    }
  }

  const { data } = await supabase.from("certificates").insert(certificateData).select("id").maybeSingle();

  if (data) await recordAudit("create", "certificates", data.id, { name: certificateData.recipient_name });

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

export async function sendCertificateEmail(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
  const certificate = data as Certificate | null;

  if (!certificate?.recipient_email || certificate.status !== "issued" || !process.env.RESEND_API_KEY) {
    redirect("/admin/certificates?sent=0");
  }

  const baseUrl = getSiteUrl("https://lynvo.tech");
  const printUrl = certificatePrintUrl(baseUrl, certificate.id);
  const publicVerifyUrl = verifyUrl(baseUrl, certificate.code);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "LYNVO <notifications@lynvo.studio>",
      to: certificate.recipient_email,
      subject: `Your LYNVO certificate ${certificate.code}`,
      text: [
        `Hi ${certificate.recipient_name},`,
        "",
        "Your LYNVO certificate is ready.",
        "",
        `Download or print it here: ${printUrl}`,
        `Public verification link: ${publicVerifyUrl}`,
        "",
        "LYNVO CREATIVE SOLUTIONS LLP",
      ].join("\n"),
    }),
  });

  if (response.ok) {
    await recordAudit("email", "certificates", certificate.id, { to: certificate.recipient_email });
  }

  redirect(`/admin/certificates?sent=${response.ok ? "1" : "0"}`);
}

export async function saveCertificateSettings(
  _prev: CertificateSettingsState,
  formData: FormData
): Promise<CertificateSettingsState> {
  await requireManager();

  const supabase = createClient();
  const rows = CERTIFICATE_SETTING_KEYS.map((key) => ({
    key,
    value: { text: String(formData.get(key) ?? "").trim() },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) return { ok: false, message: "Could not save certificate layout." };

  await recordAudit("update", "site_settings", null, { scope: "certificates" });
  revalidatePath("/admin/certificates");
  revalidatePath("/admin/print/certificate/[id]", "page");

  return { ok: true, message: "Certificate layout saved." };
}
