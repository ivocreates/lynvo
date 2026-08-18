"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember } from "@/lib/auth";

export type ProfileState = { ok: boolean; message: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const schema = z.object({
  display_name: z.string().trim().min(2).max(120),
  phone: optional(40),
  bio: optional(2000),
  skills: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    ),
});

/** Self-service fields only — role, activation, and dates stay with managers. */
export async function updateOwnProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const profile = await requireTeamMember();

  const parsed = schema.safeParse({
    display_name: formData.get("display_name"),
    phone: formData.get("phone") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    skills: formData.get("skills") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: "Check the form fields and try again." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);

  if (error) {
    return { ok: false, message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/staff/profile");
  revalidatePath("/staff/directory");
  return { ok: true, message: "Profile saved." };
}
