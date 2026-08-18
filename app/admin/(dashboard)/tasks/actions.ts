"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireManager, recordAudit } from "@/lib/auth";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/team";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null));

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => value || null),
  assignee_id: optionalUuid,
  project_id: optionalUuid,
  priority: z.enum(TASK_PRIORITIES as [TaskPriority, ...TaskPriority[]]).catch("normal"),
  due_date: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

export async function createTask(formData: FormData) {
  const actor = await requireManager();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    assignee_id: formData.get("assignee_id") ?? undefined,
    project_id: formData.get("project_id") ?? undefined,
    priority: formData.get("priority") ?? "normal",
    due_date: formData.get("due_date") ?? undefined,
  });

  if (!parsed.success) return;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("staff_tasks")
    .insert({ ...parsed.data, created_by: actor.id })
    .select("id")
    .maybeSingle();

  if (!error && data) await recordAudit("create", "staff_tasks", data.id, { title: parsed.data.title });

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
}

export async function reviewTask(formData: FormData) {
  const actor = await requireManager();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reviewNote = String(formData.get("review_note") ?? "").trim().slice(0, 2000) || null;

  if (!id || !TASK_STATUSES.includes(status as TaskStatus)) return;

  const supabase = createClient();
  await supabase
    .from("staff_tasks")
    .update({
      status,
      review_note: reviewNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.id,
    })
    .eq("id", id);

  await recordAudit("review", "staff_tasks", id, { status });

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
}

export async function deleteTask(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_tasks").delete().eq("id", id);
  await recordAudit("delete", "staff_tasks", id);

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
}
