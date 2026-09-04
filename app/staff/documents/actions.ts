"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember } from "@/lib/auth";
import { getSupabaseUrl } from "@/lib/env";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export type DocumentSignatureState = { ok: boolean; message: string };

export async function acknowledgeDocument(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  // The trigger reverts every other column for non-managers.
  await supabase
    .from("staff_documents")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", profile.id);

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

  const supabase = createClient();
  const { data: document } = await supabase
    .from("staff_documents")
    .select("id")
    .eq("id", id)
    .eq("recipient_id", profile.id)
    .eq("status", "issued")
    .eq("signature_required", true)
    .is("recipient_signed_at", null)
    .maybeSingle();

  if (!document) return { ok: false, message: "This document is not awaiting your signature." };

  const path = `recipient-signatures/${profile.id}/${id}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("public-media")
    .upload(path, file, { contentType: "image/png", upsert: false });

  if (uploadError) return { ok: false, message: "Upload failed. Check your permissions and try again." };

  const url = `${getSupabaseUrl()}/storage/v1/object/public/public-media/${path}`;
  const { error: updateError } = await supabase
    .from("staff_documents")
    .update({ recipient_signature_url: url, recipient_signed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", profile.id);

  if (updateError) {
    await supabase.storage.from("public-media").remove([path]);
    return { ok: false, message: "Could not save the signature. Nothing was changed." };
  }

  revalidatePath("/staff/documents");
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath(`/admin/print/document/${id}`);
  return { ok: true, message: "Signature uploaded. The document is now available." };
}
