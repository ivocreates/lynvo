"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember, recordAudit } from "@/lib/auth";
import { calculateTotals, nextDocumentNumber, parseLineItems } from "@/lib/admin/billing";
import type { BillingState } from "@/app/admin/(dashboard)/billing/actions";

async function buildQuoteNumber() {
  const supabase = createClient();

  const { data: settingRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "billing_quote_prefix")
    .maybeSingle();

  const prefix = (settingRow as { value: { text?: string } | null } | null)?.value?.text || "LYNVO/QT";

  const { data: existing } = await supabase
    .from("billing_documents")
    .select("number")
    .eq("doc_type", "quote");

  return nextDocumentNumber(prefix, ((existing ?? []) as { number: string }[]).map((row) => row.number));
}

/** Team members may draft a quote; only editors and above can send one. */
export async function saveStaffQuote(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  const profile = await requireTeamMember();

  const id = String(formData.get("__id") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();

  if (!clientName) return { ok: false, message: "Client name is required." };

  const items = parseLineItems(formData);
  if (items.length === 0) return { ok: false, message: "Add at least one line item." };

  const { subtotal, discount, taxAmount, total } = calculateTotals(
    items,
    Number(formData.get("discount_amount") ?? 0) || 0
  );

  const text = (field: string) => {
    const value = String(formData.get(field) ?? "").trim();
    return value || null;
  };

  const supabase = createClient();

  const values = {
    doc_type: "quote" as const,
    status: "draft" as const,
    issue_date: text("issue_date") ?? new Date().toISOString().slice(0, 10),
    due_date: text("due_date"),
    client_name: clientName,
    client_email: text("client_email"),
    client_phone: text("client_phone"),
    client_address: text("client_address"),
    client_gstin: text("client_gstin"),
    currency: text("currency") ?? "INR",
    discount_amount: discount,
    subtotal,
    tax_amount: taxAmount,
    total,
    notes: text("notes"),
    terms: text("terms"),
  };

  let documentId = id;

  if (id) {
    const { error } = await supabase
      .from("billing_documents")
      .update(values)
      .eq("id", id)
      .eq("created_by", profile.id);
    if (error) return { ok: false, message: "Could not save this quote. It may already be under review." };
  } else {
    const { data, error } = await supabase
      .from("billing_documents")
      .insert({ ...values, number: await buildQuoteNumber(), created_by: profile.id })
      .select("id")
      .single();

    if (error) return { ok: false, message: "Could not create the quote." };
    documentId = (data as { id: string }).id;
  }

  await supabase.from("billing_document_items").delete().eq("document_id", documentId);
  const { error: itemsError } = await supabase
    .from("billing_document_items")
    .insert(items.map((item, index) => ({ ...item, document_id: documentId, position: index })));

  if (itemsError) return { ok: false, message: "Saved the quote but could not save its line items." };

  await recordAudit(id ? "update" : "create", "billing_documents", documentId, { source: "staff" });

  revalidatePath("/staff/quotes");
  redirect("/staff/quotes?saved=1");
}

export async function deleteStaffQuote(formData: FormData) {
  const profile = await requireTeamMember();

  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("billing_documents")
    .delete()
    .eq("id", id)
    .eq("created_by", profile.id)
    .eq("status", "draft");

  revalidatePath("/staff/quotes");
}
