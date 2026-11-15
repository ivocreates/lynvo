import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/env";

/**
 * Single entry point for file storage. Today it writes to the Supabase
 * `public-media` bucket; moving to Cloudflare R2 only means changing this file.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BUCKET = "public-media";

export type UploadResult = { ok: true; url: string; path: string } | { ok: false; message: string };

/** Folder names are fixed by the caller, never taken from user input. */
export type ImageFolder = "team" | "blog" | "projects" | "services" | "media" | "signatures";

export async function uploadImage(file: unknown, folder: ImageFolder, uploadedBy: string, altText?: string): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Image is larger than 5 MB. Compress it and try again." };
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, message: "Use a JPG, PNG, WebP, AVIF, GIF or SVG image." };

  // Server-generated name: the client filename is never used in the path.
  const extension = { "image/jpeg": "jpg", "image/svg+xml": "svg" }[file.type] ?? file.type.split("/")[1];
  const path = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { ok: false, message: "Upload failed. Check your permissions and try again." };

  await supabase.from("media_assets").insert({
    bucket: BUCKET,
    path,
    alt_text: altText || null,
    mime_type: file.type,
    created_by: uploadedBy,
  });

  return { ok: true, path, url: `${getSupabaseUrl()}/storage/v1/object/public/${BUCKET}/${path}` };
}
