"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { requirePermission, recordAudit } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { sanitizePlacements } from "@/lib/letters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function text(formData: FormData, field: string, max: number) {
  return String(formData.get(field) ?? "").trim().slice(0, max) || null;
}

/** Next number in the year's series, e.g. LYNVO/LTR/2026/007. */
async function nextReference(db: ReturnType<typeof createClient>, year: string) {
  const settings = await getBillingSettings();
  const prefix = `${(settings.letter_reference_prefix || "LYNVO/LTR").replace(/\/+$/, "")}/${year}/`;
  const { data } = await db.from("letters").select("reference").like("reference", `${prefix}%`);
  const highest = ((data ?? []) as { reference: string | null }[]).reduce((max, row) => {
    const number = Number(String(row.reference ?? "").slice(prefix.length));
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export async function saveLetter(formData: FormData) {
  const actor = await requirePermission("letters");

  const id = String(formData.get("id") ?? "");
  const letterDate = String(formData.get("letter_date") ?? "");
  const values = {
    title: String(formData.get("title") ?? "").trim().slice(0, 200) || "Letter",
    reference: text(formData, "reference", 120),
    letter_date: /^\d{4}-\d{2}-\d{2}$/.test(letterDate) ? letterDate : new Date().toISOString().slice(0, 10),
    recipient: text(formData, "recipient", 2000),
    subject: text(formData, "subject", 500),
    body: String(formData.get("body") ?? "").slice(0, 60_000),
    placements: sanitizePlacements(String(formData.get("placements") ?? "[]")),
    show_letterhead: formData.get("show_letterhead") !== "0",
    status: formData.get("status") === "final" ? "final" : "draft",
  };

  const db = createClient();
  if (!values.reference) values.reference = await nextReference(db, values.letter_date.slice(0, 4));

  let letterId = id;
  if (UUID.test(id)) {
    const { error } = await db
      .from("letters")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) redirect(`/admin/letters/${id}?error=${encodeURIComponent("Could not save the letter.")}`);
  } else {
    const { data, error } = await db
      .from("letters")
      .insert({ ...values, created_by: actor.id })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      redirect(`/admin/letters?error=${encodeURIComponent("Could not create the letter. Has migration 0003_letters.sql been applied?")}`);
    }
    letterId = (data as { id: string }).id;
    await recordAudit("create", "letters", letterId, { title: values.title, reference: values.reference });
  }

  revalidatePath("/admin/letters");
  revalidatePath(`/admin/letters/${letterId}`);
  if (formData.get("next") === "print") redirect(`/admin/print/letter/${letterId}`);
  redirect(`/admin/letters/${letterId}?saved=1`);
}

export async function duplicateLetter(formData: FormData) {
  const actor = await requirePermission("letters");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const db = createClient();
  const { data: row } = await db.from("letters").select("*").eq("id", id).maybeSingle();
  if (!row) redirect("/admin/letters?error=missing");
  const source = row as Record<string, unknown>;
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await db
    .from("letters")
    .insert({
      title: `${source.title} (copy)`.slice(0, 200),
      reference: await nextReference(db, today.slice(0, 4)),
      letter_date: today,
      recipient: source.recipient,
      subject: source.subject,
      body: source.body,
      placements: sanitizePlacements(source.placements),
      show_letterhead: source.show_letterhead,
      status: "draft",
      created_by: actor.id,
    })
    .select("id")
    .maybeSingle();

  revalidatePath("/admin/letters");
  if (!data) redirect(`/admin/letters?error=${encodeURIComponent("Could not copy the letter.")}`);
  redirect(`/admin/letters/${(data as { id: string }).id}?copied=1`);
}

export async function deleteLetter(formData: FormData) {
  await requirePermission("letters");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const db = createClient();
  const { error } = await db.from("letters").delete().eq("id", id);
  if (!error) await recordAudit("delete", "letters", id, {});
  revalidatePath("/admin/letters");
  redirect(error ? "/admin/letters?error=delete" : "/admin/letters?deleted=1");
}

/** Uploads a one-off signature or stamp image for the letter editor. */
export async function uploadLetterAsset(formData: FormData): Promise<{ ok: boolean; message: string; url?: string }> {
  const actor = await requirePermission("letters");
  // No SVG: an uploaded SVG could carry script when opened on its own.
  const result = await uploadImage(formData.get("file"), "signatures", actor.id, "Letter signature / stamp", SIGNATURE_TYPES, 3 * 1024 * 1024);
  if (!result.ok) return { ok: false, message: result.message };
  await recordAudit("upload", "media_assets", null, { path: result.path, folder: "signatures" });
  return { ok: true, message: "Uploaded.", url: result.url };
}
