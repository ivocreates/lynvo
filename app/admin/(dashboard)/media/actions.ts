"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireAdmin, recordAudit } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

const BUCKET = "public-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

export type MediaState = { ok: boolean; message: string };

export async function uploadMedia(_prev: MediaState, formData: FormData): Promise<MediaState> {
  const profile = await requirePermission("website");

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

export type ImageUploadResult = { ok: boolean; message: string; url?: string };

const UPLOAD_FOLDERS = ["team", "blog", "projects", "services", "media"] as const;

/** Used by image fields and the blog editor: uploads one image and returns its URL. */
export async function uploadImageAction(formData: FormData): Promise<ImageUploadResult> {
  const profile = await requirePermission("website");
  const requested = String(formData.get("folder") ?? "media");
  const folder = (UPLOAD_FOLDERS as readonly string[]).includes(requested) ? (requested as (typeof UPLOAD_FOLDERS)[number]) : "media";

  const result = await uploadImage(formData.get("file"), folder, profile.id, String(formData.get("alt_text") ?? "").trim());
  if (!result.ok) return { ok: false, message: result.message };

  await recordAudit("upload", "media_assets", null, { path: result.path, folder });
  revalidatePath("/admin/media");
  return { ok: true, message: "Uploaded.", url: result.url };
}
