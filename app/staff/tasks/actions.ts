"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { requireTeamMember } from "@/lib/auth";
import { TASK_STATUSES, type TaskStatus } from "@/lib/team";

const SELF_SERVICE: TaskStatus[] = ["todo", "working", "completed", "blocked"];

export async function updateTaskStatus(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !TASK_STATUSES.includes(status as TaskStatus)) return;
  if (!SELF_SERVICE.includes(status as TaskStatus)) return;

  const db = createClient();
  // RLS restricts this to the assignee; the trigger blocks field tampering.
  await db.from("staff_tasks").update({ status }).eq("id", id).eq("assignee_id", profile.id);

  revalidatePath("/staff/tasks");
  revalidatePath("/staff");
}
