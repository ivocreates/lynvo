import "server-only";

import { createClient } from "@/lib/db/server";
import { getMediaBucket } from "@/lib/db/cloudflare";

/**
 * File storage on Cloudflare R2 (binding MEDIA). Files are served by
 * app/media/[...path]/route.ts at /media/<key>, so URLs stay on our domain.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadResult = { ok: true; url: string; path: string } | { ok: false; message: string };

/** Folder names are fixed by the caller, never taken from user input. */
export type ImageFolder = "team" | "blog" | "projects" | "services" | "media" | "signatures" | `recipient-signatures/${string}`;

export const mediaUrl = (key: string) => `/media/${key}`;

/** Extracts the R2 key from a /media/... URL (or returns null for external URLs). */
export function mediaKey(url: string | null | undefined) {
  if (!url) return null;
  const match = /\/media\/(.+)$/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function putFile(key: string, file: File) {
  await getMediaBucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });
}

export async function deleteFile(key: string) {
  await getMediaBucket().delete(key);
}

export async function uploadImage(
  file: unknown,
  folder: ImageFolder,
  uploadedBy: string,
  altText?: string,
  allowed: string[] = IMAGE_TYPES,
  maxBytes = MAX_IMAGE_BYTES
): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > maxBytes) return { ok: false, message: `Image is larger than ${Math.round(maxBytes / 1024 / 1024)} MB. Compress it and try again.` };
  if (!allowed.includes(file.type)) return { ok: false, message: "Use a JPG, PNG, WebP, AVIF, GIF or SVG image." };

  // Server-generated name: the client filename is never used in the path.
  const extension = ({ "image/jpeg": "jpg", "image/svg+xml": "svg" } as Record<string, string>)[file.type] ?? file.type.split("/")[1];
  const key = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  try {
    await putFile(key, file);
  } catch {
    return { ok: false, message: "Upload failed. Please try again." };
  }

  await createClient().from("media_assets").insert({
    bucket: "public-media",
    path: key,
    alt_text: altText || null,
    mime_type: file.type,
    created_by: uploadedBy,
  });

  return { ok: true, path: key, url: mediaUrl(key) };
}
