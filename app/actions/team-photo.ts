"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { can, hasRole, recordAudit, requireTeamMember } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PhotoResult = { ok: boolean; message: string; url?: string | null };

/** You can change your own photo; admins and website editors can change anyone's. */
async function target(formData: FormData) {
  const actor = await requireTeamMember();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { actor, id: null };
  if (id === actor.id) return { actor, id };
  const allowed = hasRole(actor, "admin") || (await can(actor, "website"));
  return { actor, id: allowed ? id : null };
}

function refresh() {
  revalidatePath("/admin/admins");
  revalidatePath("/staff/profile");
  revalidatePath("/staff/directory");
  revalidatePath("/team");
  revalidatePath("/about");
  revalidatePath("/");
}

export async function uploadTeamPhoto(formData: FormData): Promise<PhotoResult> {
  const { actor, id } = await target(formData);
  if (!id) return { ok: false, message: "You can only change your own photo." };

  const result = await uploadImage(formData.get("file"), "team", actor.id, "Team photo", PHOTO_TYPES, 5 * 1024 * 1024);
  if (!result.ok) return { ok: false, message: result.message };

  const { error } = await createClient().from("profiles").update({ avatar_url: result.url }).eq("id", id);
  if (error) return { ok: false, message: "Uploaded, but the profile could not be updated." };

  await recordAudit("update", "profiles", id, { fields: ["avatar_url"] });
  refresh();
  return { ok: true, message: "Photo updated.", url: result.url };
}

export async function removeTeamPhoto(formData: FormData): Promise<PhotoResult> {
  const { id } = await target(formData);
  if (!id) return { ok: false, message: "You can only change your own photo." };
  const { error } = await createClient().from("profiles").update({ avatar_url: null }).eq("id", id);
  if (error) return { ok: false, message: "Could not remove the photo." };
  refresh();
  return { ok: true, message: "Photo removed.", url: null };
}
