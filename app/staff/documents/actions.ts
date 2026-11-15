"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { requireTeamMember } from "@/lib/auth";
import { deleteFile, mediaUrl, putFile } from "@/lib/storage";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export type DocumentSignatureState = { ok: boolean; message: string };

export async function acknowledgeDocument(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = createClient();
  // The trigger reverts every other column for non-managers; the .or() blocks
  // acknowledgement server-side until a required signature has been uploaded.
  await db
    .from("staff_documents")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", profile.id)
    .or("signature_required.eq.false,recipient_signed_at.not.is.null");

  revalidatePath("/staff/documents");
}

export async function uploadDocumentSignature(formData: FormData): Promise<DocumentSignatureState> {
  const profile = await requireTeamMember();
  const id = String(formData.get("id") ?? "").trim();
  const file = formData.get("file");

  if (!id || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a PNG signature file." };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, message: "The signature must be smaller than 2 MB." };
  }
  if (file.type !== "image/png") {
    return { ok: false, message: "Only PNG signature files are accepted." };
  }

  const db = createClient();
  const { data: document } = await db
    .from("staff_documents")
    .select("id, acknowledged_at")
    .eq("id", id)
    .eq("recipient_id", profile.id)
    .eq("status", "issued")
    .maybeSingle();

  if (!document) return { ok: false, message: "This document is not awaiting your signature." };
  if (document.acknowledged_at) return { ok: false, message: "This document has already been acknowledged." };

  const path = `recipient-signatures/${profile.id}/${id}/${crypto.randomUUID()}.png`;
  try {
    await putFile(path, file);
  } catch {
    return { ok: false, message: "Upload failed. Please try again." };
  }

  const url = mediaUrl(path);
  const { error: updateError } = await db
    .from("staff_documents")
    .update({ recipient_signature_url: url, recipient_signed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", profile.id);

  if (updateError) {
    await deleteFile(path).catch(() => undefined);
    return { ok: false, message: "Could not save the signature. Nothing was changed." };
  }

  revalidatePath("/staff/documents");
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath(`/admin/print/document/${id}`);
  return { ok: true, message: "Signature saved. You can now acknowledge and download the document." };
}
