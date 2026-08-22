"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin, recordAudit } from "@/lib/auth";
import {
  BILLING_SETTING_KEYS,
  calculateTotals,
  currencyForRegion,
  nextDocumentNumber,
  parseLineItems,
  readRegion,
  type DocType,
} from "@/lib/admin/billing";

export type BillingState = { ok: boolean; message: string };

export type BillingSettingsState = { ok: boolean; message: string };

function readDocType(value: FormDataEntryValue | null): DocType {
  return value === "invoice" ? "invoice" : "quote";
}

async function buildNumber(docType: DocType) {
  const supabase = createClient();

  const { data: settingRows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["billing_quote_prefix", "billing_invoice_prefix"]);

  const prefixes: Record<string, string> = {};
  for (const row of (settingRows ?? []) as { key: string; value: { text?: string } | null }[]) {
    prefixes[row.key] = row.value?.text ?? "";
  }

  const prefix =
    docType === "invoice"
      ? prefixes.billing_invoice_prefix || "LYNVO/INV"
      : prefixes.billing_quote_prefix || "LYNVO/QT";

  const { data: existing } = await supabase
    .from("billing_documents")
    .select("number")
    .eq("doc_type", docType);

  return nextDocumentNumber(
    prefix,
    ((existing ?? []) as { number: string }[]).map((row) => row.number)
  );
}

export async function saveDocument(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  const profile = await requireStaff();

  const id = String(formData.get("__id") ?? "").trim();
  const docType = readDocType(formData.get("doc_type"));
  const clientName = String(formData.get("client_name") ?? "").trim();

  if (!clientName) return { ok: false, message: "Client name is required." };

  const items = parseLineItems(formData);
  if (items.length === 0) return { ok: false, message: "Add at least one line item." };

  const discountInput = Number(formData.get("discount_amount") ?? 0) || 0;
  const { subtotal, discount, taxAmount, total } = calculateTotals(items, discountInput);

  const text = (field: string) => {
    const value = String(formData.get(field) ?? "").trim();
    return value || null;
  };

  const clientId = text("client_id");
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const supabase = createClient();
  const number = id ? String(formData.get("number") ?? "").trim() : await buildNumber(docType);
  const region = readRegion(formData.get("region"));

  const values = {
    doc_type: docType,
    number,
    status: String(formData.get("status") ?? "draft"),
    issue_date: text("issue_date") ?? new Date().toISOString().slice(0, 10),
    due_date: text("due_date"),
    client_name: clientName,
    client_email: text("client_email"),
    client_phone: text("client_phone"),
    client_address: text("client_address"),
    client_gstin: text("client_gstin"),
    client_id: clientId && UUID.test(clientId) ? clientId : null,
    region,
    currency: text("currency") ?? currencyForRegion(region),
    discount_amount: discount,
    subtotal,
    tax_amount: taxAmount,
    total,
    notes: text("notes"),
    terms: text("terms"),
    updated_at: new Date().toISOString(),
  };

  let documentId = id;

  if (id) {
    const { error } = await supabase.from("billing_documents").update(values).eq("id", id);
    if (error) return { ok: false, message: friendlyError(error.message) };
  } else {
    const { data, error } = await supabase
      .from("billing_documents")
      .insert({ ...values, created_by: profile.id })
      .select("id")
      .single();

    if (error) return { ok: false, message: friendlyError(error.message) };
    documentId = (data as { id: string }).id;
  }

  // Line items are replaced wholesale; the editor always submits the full set.
  await supabase.from("billing_document_items").delete().eq("document_id", documentId);

  const { error: itemsError } = await supabase.from("billing_document_items").insert(
    items.map((item, index) => ({ ...item, document_id: documentId, position: index }))
  );

  if (itemsError) return { ok: false, message: "Saved the document but could not save its line items." };

  await recordAudit(id ? "update" : "create", "billing_documents", documentId, { number, docType });

  revalidatePath("/admin/billing");
  redirect(`/admin/billing?saved=1`);
}

export async function deleteDocument(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from("billing_documents").delete().eq("id", id);

  if (!error) await recordAudit("delete", "billing_documents", id);

  revalidatePath("/admin/billing");
  redirect(`/admin/billing?deleted=${error ? "0" : "1"}`);
}

export async function saveBillingSettings(
  _prev: BillingSettingsState,
  formData: FormData
): Promise<BillingSettingsState> {
  await requireAdmin();

  const supabase = createClient();
  const rows = BILLING_SETTING_KEYS.map((key) => ({
    key,
    value: { text: String(formData.get(key) ?? "").trim() },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) return { ok: false, message: "Could not save billing settings." };

  await recordAudit("update", "site_settings", null, { scope: "billing" });
  revalidatePath("/admin/billing/settings");
  revalidatePath("/admin/billing");

  return { ok: true, message: "Billing settings saved." };
}

function friendlyError(message: string) {
  if (message.includes("duplicate key")) return "That document number already exists.";
  if (message.includes("row-level security")) return "You do not have permission to do that.";
  return "Could not save. Please check the values and try again.";
}
