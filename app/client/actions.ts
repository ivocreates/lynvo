"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Client accepts a sent quotation; recorded with their typed name and a timestamp. */
export async function acceptQuote(formData: FormData) {
  await requireClient();

  const id = String(formData.get("id") ?? "");
  const signer = String(formData.get("signer") ?? "").trim().slice(0, 120);
  const agreed = formData.get("agree") === "on";

  if (!id) return;
  if (!agreed || signer.length < 2) redirect(`/client/quotes/${id}?error=confirm`);

  const supabase = createClient();
  const { data, error } = await supabase.rpc("client_accept_quote", { doc: id, signer });

  revalidatePath("/client/quotes");
  revalidatePath("/client");
  redirect(`/client/quotes/${id}?${error || !data ? "error=accept" : "accepted=1"}`);
}

/** Client e-signs an agreement: typed name + designation, timestamped by the database. */
export async function signAgreement(formData: FormData) {
  await requireClient();

  const id = String(formData.get("id") ?? "");
  const signer = String(formData.get("signer") ?? "").trim().slice(0, 120);
  const designation = String(formData.get("designation") ?? "").trim().slice(0, 120);
  if (!id) return;
  if (formData.get("agree") !== "on" || signer.length < 2) redirect(`/client/documents/${id}?error=confirm`);

  const supabase = createClient();
  const { data, error } = await supabase.rpc("client_sign_agreement", { agreement: id, signer, designation });

  revalidatePath("/client/documents");
  redirect(`/client/documents/${id}?${error || !data ? "error=sign" : "signed=1"}`);
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
