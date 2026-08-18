"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember } from "@/lib/auth";
import { NOTE_VISIBILITIES, type NoteVisibility } from "@/lib/team";

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .transform((value) => value || null),
  visibility: z.enum(NOTE_VISIBILITIES as [NoteVisibility, ...NoteVisibility[]]).catch("private"),
  pinned: z.boolean(),
});

export async function createNote(formData: FormData) {
  const profile = await requireTeamMember();

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? undefined,
    visibility: formData.get("visibility") ?? "private",
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) return;

  const supabase = createClient();
  await supabase.from("staff_notes").insert({ ...parsed.data, author_id: profile.id });

  revalidatePath("/staff/notes");
}

export async function updateNote(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? undefined,
    visibility: formData.get("visibility") ?? "private",
    pinned: formData.get("pinned") === "on",
  });

  if (!parsed.success) return;

  const supabase = createClient();
  await supabase
    .from("staff_notes")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", profile.id);

  revalidatePath("/staff/notes");
}

export async function deleteNote(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_notes").delete().eq("id", id).eq("author_id", profile.id);

  revalidatePath("/staff/notes");
}
