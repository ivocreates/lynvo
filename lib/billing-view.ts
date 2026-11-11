import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ITEM_COLUMNS, normaliseItems } from "@/lib/admin/billing-server";
import type {
  BillingDocumentRecord,
  BillingPaymentLine,
  ProjectBillingSummary,
} from "@/components/documents/billing-document";

/**
 * Everything needed to render a quote/invoice. RLS decides what the caller may
 * see, so the same loader serves staff print views and the client portal.
 */
export async function loadBillingView(id: string, scope: { clientId?: string } = {}) {
  const supabase = createClient();

  let query = supabase.from("billing_documents").select("*").eq("id", id);
  if (scope.clientId) query = query.eq("client_id", scope.clientId);
  const { data: document } = await query.maybeSingle();
  if (!document) return null;

  const doc = document as unknown as BillingDocumentRecord & {
    id: string;
    source_quote_id: string | null;
    client_id: string | null;
  };

  const [{ data: itemRows }, { data: paymentRows }, { data: quoteRow }, { data: siblingRows }] = await Promise.all([
    supabase.from("billing_document_items").select(ITEM_COLUMNS).eq("document_id", id).order("position"),
    doc.doc_type === "invoice"
      ? supabase.from("billing_payments").select("paid_on, amount, method, reference").eq("document_id", id).order("paid_on")
      : Promise.resolve({ data: [] }),
    doc.source_quote_id
      ? supabase.from("billing_documents").select("number, total").eq("id", doc.source_quote_id).maybeSingle()
      : Promise.resolve({ data: null }),
    doc.source_quote_id
      ? supabase
          .from("billing_documents")
          .select("id, total, status, issue_date")
          .eq("source_quote_id", doc.source_quote_id)
          .eq("doc_type", "invoice")
      : Promise.resolve({ data: [] }),
  ]);

  const quote = quoteRow as { number: string; total: number } | null;

  // "Invoiced to date" counts this invoice and earlier ones, never later ones.
  const invoicedToDate = ((siblingRows ?? []) as { id: string; total: number; status: string; issue_date: string }[])
    .filter((row) => row.status !== "cancelled" && (row.issue_date <= doc.issue_date || row.id === doc.id))
    .reduce((sum, row) => sum + Number(row.total), 0);

  const project: ProjectBillingSummary | null = quote
    ? { quoteNumber: quote.number, quoteTotal: Number(quote.total), invoicedToDate }
    : null;

  return {
    doc,
    items: normaliseItems(itemRows),
    payments: (paymentRows ?? []) as BillingPaymentLine[],
    project,
  };
}

/** A payment with the invoice figures a receipt prints. RLS scopes clients to their own. */
export async function loadReceipt(paymentId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("billing_payments")
    .select("id, amount, currency, paid_on, method, reference, client_id, billing_documents(id, number, total, amount_paid, balance_due, client_name, client_address)")
    .eq("id", paymentId)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as {
    id: string;
    amount: number;
    currency: string;
    paid_on: string;
    method: string;
    reference: string | null;
    client_id: string | null;
    billing_documents: {
      id: string;
      number: string;
      total: number;
      amount_paid: number;
      balance_due: number;
      client_name: string;
      client_address: string | null;
    } | null;
  };
  if (!row.billing_documents) return null;

  return {
    clientId: row.client_id,
    documentId: row.billing_documents.id,
    receipt: {
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency,
      paid_on: row.paid_on,
      method: row.method,
      reference: row.reference,
      invoice: row.billing_documents,
    },
  };
}
