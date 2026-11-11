"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireAdmin, recordAudit } from "@/lib/auth";
import { getSupabaseUrl } from "@/lib/env";
import {
  BILLING_SETTING_KEYS,
  MANUAL_STATUSES,
  PAYMENT_METHODS,
  SUBSCRIPTION_CYCLES,
  addDays,
  addMonths,
  buildInvoiceFromQuote,
  calculateTotals,
  currencyForRegion,
  cycleMonths,
  parseLineItems,
  readRegion,
  todayIso,
  type ConversionMode,
  type DocType,
  type LineItem,
} from "@/lib/admin/billing";
import {
  ITEM_COLUMNS,
  UUID,
  ensureClientAccount,
  getSetting,
  insertDocument,
  normaliseItems,
} from "@/lib/admin/billing-server";

export type BillingState = { ok: boolean; message: string };

export type BillingSettingsState = { ok: boolean; message: string };

function readDocType(value: FormDataEntryValue | null): DocType {
  return value === "invoice" ? "invoice" : "quote";
}

function revalidateBilling(id?: string, clientId?: string | null) {
  revalidatePath("/admin/billing");
  revalidatePath("/admin/billing/payments");
  revalidatePath("/client/quotes");
  revalidatePath("/client");
  if (id) revalidatePath(`/admin/billing/${id}`);
  if (clientId) revalidatePath(`/admin/clients/${clientId}/account`);
}

function back(formData: FormData, fallback: string) {
  const target = String(formData.get("redirect_to") ?? "");
  // Only same-site admin paths; never an open redirect.
  return target.startsWith("/admin/") ? target : fallback;
}

function withFlag(path: string, flag: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${flag}`;
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

export async function saveDocument(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const profile = await requirePermission("billing.manage");

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

  const supabase = createClient();
  const region = readRegion(formData.get("region"));

  let clientId = text("client_id");
  if (clientId && !UUID.test(clientId)) clientId = null;

  // "Create a client account" is on by default so every client ends up with one.
  if (!clientId && formData.get("create_client") === "on") {
    clientId = await ensureClientAccount(
      supabase,
      {
        name: clientName,
        email: text("client_email"),
        phone: text("client_phone"),
        address: text("client_address"),
        gstin: text("client_gstin"),
        region,
      },
      profile.id
    );
  }

  const requestedStatus = String(formData.get("status") ?? "draft");
  const values = {
    doc_type: docType,
    issue_date: text("issue_date") ?? todayIso(),
    due_date: text("due_date"),
    client_name: clientName,
    client_email: text("client_email"),
    client_phone: text("client_phone"),
    client_address: text("client_address"),
    client_gstin: text("client_gstin"),
    client_id: clientId,
    region,
    currency: text("currency") ?? currencyForRegion(region),
    discount_amount: discount,
    subtotal,
    tax_amount: taxAmount,
    total,
    notes: text("notes"),
    terms: text("terms"),
  };

  let documentId = id;

  if (id) {
    const { data: current } = await supabase
      .from("billing_documents")
      .select("status, amount_paid")
      .eq("id", id)
      .maybeSingle();

    // Paid / partially-paid follow payments; only manual statuses may be set by hand.
    const keepStatus =
      !MANUAL_STATUSES[docType].includes(requestedStatus) ||
      (current && ["paid", "partially_paid"].includes((current as { status: string }).status) && requestedStatus !== "cancelled");

    const { error } = await supabase
      .from("billing_documents")
      .update(keepStatus ? values : { ...values, status: requestedStatus })
      .eq("id", id);
    if (error) return { ok: false, message: friendlyError(error.message) };

    await supabase.from("billing_document_items").delete().eq("document_id", documentId);
    const { error: itemsError } = await supabase
      .from("billing_document_items")
      .insert(items.map((item, index) => ({ ...item, document_id: documentId, position: index })));
    if (itemsError) return { ok: false, message: "Saved the document but could not save its line items." };

    // Totals may have changed; re-derive paid status against the new total.
    await supabase.rpc("refresh_billing_document_payments", { doc: id });
  } else {
    const result = await insertDocument(
      supabase,
      {
        ...values,
        status: MANUAL_STATUSES[docType].includes(requestedStatus) ? requestedStatus : "draft",
        discount: discountInput,
      },
      items,
      profile.id
    );
    if ("error" in result) return { ok: false, message: result.error };
    documentId = result.id;
  }

  await recordAudit(id ? "update" : "create", "billing_documents", documentId, { docType });

  revalidateBilling(documentId, clientId);
  redirect(`/admin/billing/${documentId}?saved=1`);
}

export async function deleteDocument(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from("billing_documents").delete().eq("id", id);

  if (!error) await recordAudit("delete", "billing_documents", id);

  revalidateBilling();
  redirect(`/admin/billing?deleted=${error ? "0" : "1"}`);
}

export async function setDocumentStatus(formData: FormData) {
  await requirePermission("billing.manage");

  const id = String(formData.get("__id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const target = back(formData, `/admin/billing/${id}`);
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("billing_documents")
    .select("doc_type, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc) redirect(withFlag(target, "error=missing"));

  const { doc_type, client_id } = doc as { doc_type: DocType; client_id: string | null };
  if (!MANUAL_STATUSES[doc_type].includes(status)) redirect(withFlag(target, "error=status"));

  const { error } = await supabase.from("billing_documents").update({ status }).eq("id", id);
  if (error) redirect(withFlag(target, "error=status"));

  // Moving an invoice back from cancelled/draft must respect payments already recorded.
  if (doc_type === "invoice" && status === "sent") {
    await supabase.rpc("refresh_billing_document_payments", { doc: id });
  }

  await recordAudit("status_change", "billing_documents", id, { status });
  revalidateBilling(id, client_id);
  redirect(withFlag(target, "saved=1"));
}

export async function duplicateDocument(formData: FormData) {
  const profile = await requirePermission("billing.manage");

  const id = String(formData.get("__id") ?? "").trim();
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const [{ data: doc }, { data: itemRows }] = await Promise.all([
    supabase.from("billing_documents").select("*").eq("id", id).maybeSingle(),
    supabase.from("billing_document_items").select(ITEM_COLUMNS).eq("document_id", id).order("position"),
  ]);
  if (!doc) redirect("/admin/billing?error=missing");

  const source = doc as Record<string, any>;
  const result = await insertDocument(
    supabase,
    {
      doc_type: source.doc_type,
      client_id: source.client_id,
      client_name: source.client_name,
      client_email: source.client_email,
      client_phone: source.client_phone,
      client_address: source.client_address,
      client_gstin: source.client_gstin,
      region: readRegion(source.region),
      currency: source.currency,
      discount: Number(source.discount_amount),
      notes: source.notes,
      terms: source.terms,
      engagement_id: source.engagement_id,
    },
    normaliseItems(itemRows),
    profile.id
  );

  if ("error" in result) redirect(`/admin/billing/${id}?error=${encodeURIComponent(result.error)}`);

  await recordAudit("duplicate", "billing_documents", result.id, { from: id });
  revalidateBilling(result.id, source.client_id);
  redirect(`/admin/billing/${result.id}/edit?duplicated=1`);
}

// ---------------------------------------------------------------------------
// Quote -> invoice
// ---------------------------------------------------------------------------

export async function convertQuote(formData: FormData) {
  const profile = await requirePermission("billing.manage");

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  const mode = String(formData.get("mode") ?? "percent") as ConversionMode;
  const value = Number(formData.get("value") ?? 0) || 0;
  const dueInDays = Math.max(0, Math.min(120, Number(formData.get("due_in_days") ?? 7) || 0));
  const issueNow = formData.get("issue_now") === "on";
  const createSubscriptions = formData.get("create_subscriptions") === "on";
  const fail = (message: string): never =>
    redirect(`/admin/billing/${quoteId}?error=${encodeURIComponent(message)}`);

  if (!UUID.test(quoteId)) return;
  if (!["full", "percent", "amount", "balance"].includes(mode)) fail("Choose how much to invoice.");

  const supabase = createClient();
  const [{ data: quoteRow }, { data: itemRows }, { data: priorRows }] = await Promise.all([
    supabase.from("billing_documents").select("*").eq("id", quoteId).eq("doc_type", "quote").maybeSingle(),
    supabase.from("billing_document_items").select(ITEM_COLUMNS).eq("document_id", quoteId).order("position"),
    supabase
      .from("billing_documents")
      .select("total, status")
      .eq("source_quote_id", quoteId)
      .eq("doc_type", "invoice"),
  ]);

  if (!quoteRow) fail("Quote not found.");
  const quote = quoteRow as Record<string, any>;
  if (quote.status === "cancelled") fail("This quote is cancelled.");

  const items = normaliseItems(itemRows);
  const alreadyInvoiced = ((priorRows ?? []) as { total: number; status: string }[])
    .filter((row) => row.status !== "cancelled")
    .reduce((sum, row) => sum + Number(row.total), 0);

  const built = buildInvoiceFromQuote({
    quote: {
      number: quote.number,
      subtotal: Number(quote.subtotal),
      discount_amount: Number(quote.discount_amount),
      tax_amount: Number(quote.tax_amount),
      total: Number(quote.total),
      currency: quote.currency,
    },
    items,
    mode,
    value,
    alreadyInvoiced,
  });

  if (!built.ok) fail(built.message);
  const conversion = built as Extract<typeof built, { ok: true }>;

  const clientId =
    quote.client_id ??
    (await ensureClientAccount(
      supabase,
      {
        name: quote.client_name,
        email: quote.client_email,
        phone: quote.client_phone,
        address: quote.client_address,
        gstin: quote.client_gstin,
        region: readRegion(quote.region),
      },
      profile.id
    ));

  const invoiceTerms = await getSetting(supabase, "billing_invoice_terms");
  const today = todayIso();

  const result = await insertDocument(
    supabase,
    {
      doc_type: "invoice",
      status: issueNow ? "sent" : "draft",
      issue_date: today,
      due_date: addDays(today, dueInDays),
      client_id: clientId,
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_address: quote.client_address,
      client_gstin: quote.client_gstin,
      region: readRegion(quote.region),
      currency: quote.currency,
      discount: conversion.discount,
      notes: conversion.summary,
      terms: invoiceTerms || quote.terms,
      invoice_kind: conversion.kind,
      source_quote_id: quoteId,
      engagement_id: quote.engagement_id,
    },
    conversion.items,
    profile.id
  );

  if ("error" in result) fail(result.error);
  const invoice = result as { id: string; number: string };

  // Raising an invoice means the client has agreed to the quote.
  const quoteUpdates: Record<string, unknown> = {};
  if (["draft", "sent"].includes(quote.status)) quoteUpdates.status = "accepted";
  if (!quote.client_id && clientId) quoteUpdates.client_id = clientId;
  if (Object.keys(quoteUpdates).length > 0) {
    await supabase.from("billing_documents").update(quoteUpdates).eq("id", quoteId);
  }

  // Recurring quote lines (maintenance, hosting, retainers) become subscriptions once.
  if (createSubscriptions && clientId && alreadyInvoiced === 0) {
    const recurring = items.filter((item) => item.recurring !== "one_time");
    if (recurring.length > 0) {
      await supabase.from("client_subscriptions").insert(
        recurring.map((item: LineItem) => ({
          client_id: clientId,
          name: item.name,
          description: item.description,
          category: item.category ?? "Maintenance",
          amount: Number(item.unit_price) * Number(item.quantity),
          tax_rate: item.tax_rate,
          currency: quote.currency,
          cycle: item.recurring === "yearly" ? "yearly" : "monthly",
          start_date: today,
          next_invoice_on: today,
          created_by: profile.id,
        }))
      );
    }
  }

  await recordAudit("convert", "billing_documents", invoice.id, { quote: quoteId, mode, kind: conversion.kind });

  revalidateBilling(quoteId, clientId);
  revalidatePath("/admin/billing/subscriptions");
  redirect(`/admin/billing/${invoice.id}?converted=1`);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(formData: FormData) {
  const profile = await requirePermission("billing.manage");

  const documentId = String(formData.get("document_id") ?? "").trim();
  const target = back(formData, `/admin/billing/${documentId}`);
  if (!UUID.test(documentId)) return;

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("billing_documents")
    .select("doc_type, status, total, amount_paid, client_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) redirect(withFlag(target, "error=missing"));
  const invoice = doc as { doc_type: string; status: string; total: number; amount_paid: number; client_id: string | null };

  if (invoice.doc_type !== "invoice") redirect(withFlag(target, `error=${encodeURIComponent("Payments are recorded against invoices.")}`));
  if (invoice.status === "cancelled") redirect(withFlag(target, `error=${encodeURIComponent("This invoice is cancelled.")}`));

  const balance = Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100) / 100;
  const fullBalance = formData.get("full_balance") === "on";
  const amount = fullBalance ? balance : Math.round((Number(formData.get("amount") ?? 0) || 0) * 100) / 100;

  if (!(amount > 0)) redirect(withFlag(target, `error=${encodeURIComponent("Enter the amount received.")}`));
  if (amount > balance + 0.01) {
    redirect(withFlag(target, `error=${encodeURIComponent("That is more than the balance due on this invoice.")}`));
  }

  const method = String(formData.get("method") ?? "bank_transfer");
  const text = (field: string) => String(formData.get(field) ?? "").trim() || null;

  // A draft invoice that gets paid has evidently been issued.
  if (invoice.status === "draft") {
    await supabase.from("billing_documents").update({ status: "sent" }).eq("id", documentId);
  }

  const { data: payment, error } = await supabase
    .from("billing_payments")
    .insert({
      document_id: documentId,
      amount,
      paid_on: text("paid_on") ?? todayIso(),
      method: PAYMENT_METHODS.some((entry) => entry.value === method) ? method : "other",
      reference: text("reference"),
      notes: text("notes"),
      recorded_by: profile.id,
    })
    .select("id")
    .maybeSingle();

  if (error || !payment) redirect(withFlag(target, `error=${encodeURIComponent("Could not record the payment.")}`));

  await recordAudit("payment", "billing_documents", documentId, { amount, method });
  revalidateBilling(documentId, invoice.client_id);
  redirect(withFlag(target, "paid=1"));
}

export async function deletePayment(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("payment_id") ?? "").trim();
  const target = back(formData, "/admin/billing/payments");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const { data: payment } = await supabase
    .from("billing_payments")
    .select("document_id, client_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("billing_payments").delete().eq("id", id);

  await recordAudit("payment_delete", "billing_payments", id);
  const row = payment as { document_id: string; client_id: string | null } | null;
  revalidateBilling(row?.document_id, row?.client_id);
  redirect(withFlag(target, "saved=1"));
}

// ---------------------------------------------------------------------------
// Subscriptions (maintenance, hosting, retainers)
// ---------------------------------------------------------------------------

export async function saveSubscription(formData: FormData) {
  const profile = await requirePermission("billing.manage");

  const id = String(formData.get("id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const target = back(formData, "/admin/billing/subscriptions");
  const name = String(formData.get("name") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "monthly");
  const status = String(formData.get("status") ?? "active");

  if (!UUID.test(clientId) || !name) {
    redirect(withFlag(target, `error=${encodeURIComponent("Choose a client and name the service.")}`));
  }

  const text = (field: string) => String(formData.get(field) ?? "").trim() || null;
  const startDate = text("start_date") ?? todayIso();

  const values = {
    client_id: clientId,
    name,
    description: text("description"),
    category: text("category") ?? "Maintenance",
    amount: Math.max(0, Number(formData.get("amount") ?? 0) || 0),
    tax_rate: Math.max(0, Math.min(100, Number(formData.get("tax_rate") ?? 0) || 0)),
    currency: (text("currency") ?? "INR").toUpperCase(),
    cycle: SUBSCRIPTION_CYCLES.some((entry) => entry.value === cycle) ? cycle : "monthly",
    start_date: startDate,
    next_invoice_on: text("next_invoice_on") ?? startDate,
    status: ["active", "paused", "cancelled"].includes(status) ? status : "active",
    notes: text("notes"),
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = id
    ? await supabase.from("client_subscriptions").update(values).eq("id", id)
    : await supabase.from("client_subscriptions").insert({ ...values, created_by: profile.id });

  if (error) redirect(withFlag(target, `error=${encodeURIComponent("Could not save the subscription.")}`));

  await recordAudit(id ? "update" : "create", "client_subscriptions", id || null, { name });
  revalidatePath("/admin/billing/subscriptions");
  revalidatePath(`/admin/clients/${clientId}/account`);
  redirect(withFlag(target, "saved=1"));
}

export async function deleteSubscription(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const target = back(formData, "/admin/billing/subscriptions");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  await supabase.from("client_subscriptions").delete().eq("id", id);
  await recordAudit("delete", "client_subscriptions", id);
  revalidatePath("/admin/billing/subscriptions");
  redirect(withFlag(target, "saved=1"));
}

/** Raises the next period's invoice for a subscription and moves its next date on. */
export async function invoiceSubscription(formData: FormData) {
  const profile = await requirePermission("billing.manage");

  const id = String(formData.get("id") ?? "").trim();
  const target = back(formData, "/admin/billing/subscriptions");
  if (!UUID.test(id)) return;

  const supabase = createClient();
  const { data: row } = await supabase
    .from("client_subscriptions")
    .select("*, clients(name, email, phone, address, gstin, region)")
    .eq("id", id)
    .maybeSingle();

  if (!row) redirect(withFlag(target, "error=missing"));
  const subscription = row as Record<string, any>;
  const client = (subscription.clients ?? {}) as Record<string, any>;

  if (subscription.status !== "active") {
    redirect(withFlag(target, `error=${encodeURIComponent("Only active subscriptions can be invoiced.")}`));
  }

  const periodStart: string = subscription.next_invoice_on ?? todayIso();
  const months = cycleMonths(subscription.cycle);
  const periodEnd = addDays(addMonths(periodStart, months), -1);
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const today = todayIso();
  const invoiceTerms = await getSetting(supabase, "billing_invoice_terms");

  const result = await insertDocument(
    supabase,
    {
      doc_type: "invoice",
      status: formData.get("issue_now") === "on" ? "sent" : "draft",
      issue_date: today,
      due_date: addDays(today, 7),
      client_id: subscription.client_id,
      client_name: client.name ?? "Client",
      client_email: client.email,
      client_phone: client.phone,
      client_address: client.address,
      client_gstin: client.gstin,
      region: readRegion(client.region),
      currency: subscription.currency,
      discount: 0,
      notes: `${subscription.name} for ${fmt(periodStart)} – ${fmt(periodEnd)}`,
      terms: invoiceTerms || null,
      invoice_kind: "recurring",
    },
    [
      {
        name: subscription.name,
        description: [subscription.description, `Service period: ${fmt(periodStart)} – ${fmt(periodEnd)}`]
          .filter(Boolean)
          .join("\n"),
        category: subscription.category ?? "Maintenance",
        // Printed as a one-off charge for this period so it counts toward the invoice total.
        recurring: "one_time",
        unit: months === 12 ? "year" : months === 1 ? "month" : `${months} months`,
        hsn_sac: null,
        quantity: 1,
        unit_price: Number(subscription.amount),
        tax_rate: Number(subscription.tax_rate),
        line_total: Number(subscription.amount),
      },
    ],
    profile.id
  );

  if ("error" in result) redirect(withFlag(target, `error=${encodeURIComponent(result.error)}`));
  const invoice = result as { id: string; number: string };

  await supabase
    .from("client_subscriptions")
    .update({ next_invoice_on: addMonths(periodStart, months), last_invoice_id: invoice.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  await recordAudit("invoice", "client_subscriptions", id, { invoice: invoice.id });
  revalidateBilling(invoice.id, subscription.client_id);
  revalidatePath("/admin/billing/subscriptions");
  redirect(`/admin/billing/${invoice.id}?converted=1`);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

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

export type ImageUploadState = { ok: boolean; message: string; url?: string };

const IMAGE_TYPES = ["image/png", "image/webp", "image/svg+xml"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Uploads a signature/stamp asset and returns its public URL for a settings field. */
export async function uploadSettingsImage(formData: FormData): Promise<ImageUploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "File is larger than 2 MB." };
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "Use a PNG, WebP or SVG with a transparent background." };
  }

  const extension = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const path = `signatures/${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("public-media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false, message: "Upload failed. Check your permissions and try again." };

  await supabase.from("media_assets").insert({ bucket: "public-media", path, mime_type: file.type });
  await recordAudit("upload", "media_assets", null, { path, scope: "billing_settings" });

  return {
    ok: true,
    message: "Uploaded.",
    url: `${getSupabaseUrl()}/storage/v1/object/public/public-media/${path}`,
  };
}

function friendlyError(message: string) {
  if (message.includes("duplicate key")) return "That document number already exists.";
  if (message.includes("row-level security")) return "You do not have permission to do that.";
  return "Could not save. Please check the values and try again.";
}
