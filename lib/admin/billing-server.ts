import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  calculateTotals,
  nextDocumentNumber,
  type DocType,
  type InvoiceKind,
  type LineItem,
  type Region,
} from "@/lib/admin/billing";

type Supabase = ReturnType<typeof createClient>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ITEM_COLUMNS =
  "name, description, category, recurring, unit, hsn_sac, quantity, unit_price, tax_rate, line_total";

export function normaliseItems(rows: unknown[] | null | undefined): LineItem[] {
  return ((rows ?? []) as LineItem[]).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: Number(item.tax_rate),
    line_total: Number(item.line_total),
  }));
}

export async function buildNumber(supabase: Supabase, docType: DocType) {
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

  const { data: existing } = await supabase.from("billing_documents").select("number").eq("doc_type", docType);

  return nextDocumentNumber(prefix, ((existing ?? []) as { number: string }[]).map((row) => row.number));
}

export interface ClientDetails {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  region?: Region;
}

/**
 * Every billed client gets an account. Reuses an existing account with the
 * same name (case-insensitive) before creating a new one.
 */
export async function ensureClientAccount(supabase: Supabase, details: ClientDetails, actorId: string) {
  const name = details.name.trim();
  if (!name) return null;

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", name.replace(/[%_]/g, (match) => `\\${match}`))
    .limit(1)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;

  const { data: created } = await supabase
    .from("clients")
    .insert({
      name,
      email: details.email || null,
      phone: details.phone || null,
      address: details.address || null,
      gstin: details.gstin || null,
      region: details.region ?? "IN",
      created_by: actorId,
    })
    .select("id")
    .maybeSingle();

  return (created as { id: string } | null)?.id ?? null;
}

export interface NewDocument {
  doc_type: DocType;
  status?: string;
  issue_date?: string;
  due_date?: string | null;
  client_id: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_gstin?: string | null;
  region: Region;
  currency: string;
  discount: number;
  notes?: string | null;
  terms?: string | null;
  invoice_kind?: InvoiceKind;
  source_quote_id?: string | null;
  engagement_id?: string | null;
}

/** Inserts a document and its line items, retrying once if the number was taken meanwhile. */
export async function insertDocument(
  supabase: Supabase,
  doc: NewDocument,
  items: LineItem[],
  actorId: string
): Promise<{ id: string; number: string } | { error: string }> {
  const totals = calculateTotals(items, doc.discount);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const number = await buildNumber(supabase, doc.doc_type);
    const { data, error } = await supabase
      .from("billing_documents")
      .insert({
        doc_type: doc.doc_type,
        number,
        status: doc.status ?? "draft",
        issue_date: doc.issue_date ?? new Date().toISOString().slice(0, 10),
        due_date: doc.due_date ?? null,
        client_id: doc.client_id,
        client_name: doc.client_name,
        client_email: doc.client_email ?? null,
        client_phone: doc.client_phone ?? null,
        client_address: doc.client_address ?? null,
        client_gstin: doc.client_gstin ?? null,
        region: doc.region,
        currency: doc.currency,
        discount_amount: totals.discount,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: doc.notes ?? null,
        terms: doc.terms ?? null,
        invoice_kind: doc.invoice_kind ?? "standard",
        source_quote_id: doc.source_quote_id ?? null,
        engagement_id: doc.engagement_id ?? null,
        created_by: actorId,
      })
      .select("id")
      .single();

    if (data) {
      const id = (data as { id: string }).id;
      const { error: itemsError } = await supabase
        .from("billing_document_items")
        .insert(items.map((item, index) => ({ ...item, document_id: id, position: index })));
      if (itemsError) return { error: "Created the document but could not save its line items." };
      return { id, number };
    }

    if (!error?.message.includes("duplicate key")) {
      return { error: error?.message.includes("row-level security") ? "You do not have permission to do that." : "Could not create the document." };
    }
  }

  return { error: "Could not allocate a document number. Please try again." };
}

export async function getSetting(supabase: Supabase, key: string) {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return ((data as { value: { text?: string } | null } | null)?.value?.text ?? "").trim();
}
