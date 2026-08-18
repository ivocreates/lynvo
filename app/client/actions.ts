"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth";

/** The client's verdict on a deliverable. The trigger blocks every other field. */
export async function reviewDeliverable(formData: FormData) {
  await requireClient();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const feedback = String(formData.get("client_feedback") ?? "").trim().slice(0, 2000) || null;

  if (!id || !["approved", "revision_requested"].includes(decision)) return;

  const supabase = createClient();
  await supabase
    .from("client_deliverables")
    .update({ status: decision, client_feedback: feedback })
    .eq("id", id);

  revalidatePath("/client");
}
