"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin, recordAudit } from "@/lib/auth";

const BUCKET = "public-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

export type MediaState = { ok: boolean; message: string };

export async function uploadMedia(_prev: MediaState, formData: FormData): Promise<MediaState> {
  const profile = await requireStaff();

  const file = formData.get("file");
  const altText = String(formData.get("alt_text") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "File is larger than 5 MB." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, message: "Only JPEG, PNG, WebP, AVIF or SVG images are allowed." };
  }

  // Server-generated path: never trust the client-supplied filename.
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, message: "Upload failed. Check your permissions and try again." };
  }

  const { error: recordError } = await supabase.from("media_assets").insert({
    bucket: BUCKET,
    path,
    alt_text: altText || null,
    mime_type: file.type,
    created_by: profile.id,
  });

  if (recordError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: "Could not record the upload. Nothing was saved." };
  }

  await recordAudit("upload", "media_assets", null, { path });
  revalidatePath("/admin/media");

  return { ok: true, message: "Uploaded." };
}

export async function deleteMedia(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id || !path) return;

  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from("media_assets").delete().eq("id", id);

  if (!error) await recordAudit("delete", "media_assets", id, { path });

  revalidatePath("/admin/media");
}
