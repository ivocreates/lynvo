"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { requirePermission, requireAdmin, recordAudit } from "@/lib/auth";
import { deleteFile, uploadImage } from "@/lib/storage";

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

  const result = await uploadImage(file, "media", profile.id, altText, ALLOWED, MAX_BYTES);
  if (!result.ok) return { ok: false, message: result.message };

  await recordAudit("upload", "media_assets", null, { path: result.path });
  revalidatePath("/admin/media");

  return { ok: true, message: "Uploaded." };
}

export async function deleteMedia(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id || !path) return;

  const db = createClient();
  // Legacy rows hold a bare path; new ones a /media/ key. Both live in R2 after migration.
  await deleteFile(path.replace(/^\/?media\//, "")).catch(() => undefined);
  const { error } = await db.from("media_assets").delete().eq("id", id);

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
