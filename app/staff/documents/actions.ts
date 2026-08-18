"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember } from "@/lib/auth";

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
