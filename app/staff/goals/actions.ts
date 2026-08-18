"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember, requireManager, hasRole } from "@/lib/auth";
import { GOAL_STATUSES, type GoalStatus } from "@/lib/team";

const numeric = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => value || null),
  owner_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null)),
  metric: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || null),
  target_value: numeric,
  due_date: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

export async function createGoal(formData: FormData) {
  const actor = await requireManager();

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    owner_id: formData.get("owner_id") ?? undefined,
    metric: formData.get("metric") ?? undefined,
    target_value: formData.get("target_value") ?? undefined,
    due_date: formData.get("due_date") ?? undefined,
  });

  if (!parsed.success) return;

  const supabase = createClient();
  await supabase.from("staff_goals").insert({ ...parsed.data, created_by: actor.id });

  revalidatePath("/staff/goals");
}

/** Owners update their own progress; managers may also change the status. */
export async function updateGoalProgress(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const current = Number(formData.get("current_value") ?? 0);
  const status = String(formData.get("status") ?? "");

  const patch: Record<string, unknown> = {
    current_value: Number.isFinite(current) ? current : 0,
    updated_at: new Date().toISOString(),
  };
  if (GOAL_STATUSES.includes(status as GoalStatus)) patch.status = status;

  const supabase = createClient();
  const query = supabase.from("staff_goals").update(patch).eq("id", id);
  // RLS allows managers anything; everyone else only their own goal.
  if (!hasRole(profile, "junior_partner")) query.eq("owner_id", profile.id);

  await query;

  revalidatePath("/staff/goals");
}

export async function deleteGoal(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_goals").delete().eq("id", id);

  revalidatePath("/staff/goals");
}
