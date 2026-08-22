"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth";

export type ReviewState = { ok: boolean; message: string };

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

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const profile = await requireClient();
  const content = String(formData.get("content") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);

  if (content.length < 10 || content.length > 2000) {
    return { ok: false, message: "Your review must be between 10 and 2,000 characters." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Choose a rating from 1 to 5." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("reviews").insert({ content, rating, client_id: profile.client_id });

  if (error) return { ok: false, message: "We could not submit your review. Please try again." };

  revalidatePath("/client");
  return { ok: true, message: "Thanks. Your review is awaiting approval." };
}
