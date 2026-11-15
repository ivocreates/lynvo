import "server-only";

import { createAdminClient } from "@/lib/db/server";
import type { ReleaseRule, ReleaseState } from "@/lib/deliverables";

export type DeliverableFile = {
  id: string;
  engagement_id: string;
  title: string;
  file_key: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  url: string | null;
  release_rule: ReleaseRule | null;
  invoice_id: string | null;
  released_at: string | null;
  visible_to_client: boolean;
};

type Invoice = { id: string; number: string; status: string; balance_due: number; currency: string; client_id: string | null };

const OPEN = ["sent", "partially_paid", "overdue"];

/**
 * Release state for many deliverables of one client in two queries. Always
 * evaluated server-side with the system client so a client can never unlock a
 * file by tampering with the request.
 */
export async function releaseStates(clientId: string, deliverables: DeliverableFile[]) {
  const system = createAdminClient();
  const { data } = await system
    .from("billing_documents")
    .select("id, number, status, balance_due, currency, client_id")
    .eq("client_id", clientId)
    .eq("doc_type", "invoice")
    .neq("status", "cancelled")
    .neq("status", "draft");
  const invoices = (data ?? []) as Invoice[];
  const outstanding = invoices.filter((invoice) => OPEN.includes(invoice.status) && Number(invoice.balance_due) > 0.009);
  const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;

  const states = new Map<string, ReleaseState>();
  for (const deliverable of deliverables) {
    states.set(deliverable.id, evaluate(deliverable, invoices, outstanding, paidCount));
  }
  return states;
}

function evaluate(deliverable: DeliverableFile, invoices: Invoice[], outstanding: Invoice[], paidCount: number): ReleaseState {
  if (deliverable.released_at) return { released: true, reason: "Released by LYNVO" };
  const rule = deliverable.release_rule ?? "immediate";

  if (rule === "immediate") return { released: true, reason: "Available" };
  if (rule === "manual") return { released: false, reason: "LYNVO will release this when it's ready." };

  if (rule === "after_invoice") {
    const invoice = invoices.find((entry) => entry.id === deliverable.invoice_id);
    if (!invoice) return { released: false, reason: "Unlocks once the related invoice is issued and paid." };
    if (invoice.status === "paid") return { released: true, reason: `Invoice ${invoice.number} paid` };
    return {
      released: false,
      reason: `Unlocks when invoice ${invoice.number} is paid.`,
      invoiceId: invoice.id,
      balance: Number(invoice.balance_due),
      currency: invoice.currency,
    };
  }

  // after_all_paid
  if (outstanding.length > 0) {
    const balance = outstanding.reduce((sum, entry) => sum + Number(entry.balance_due), 0);
    return {
      released: false,
      reason: `Unlocks when your outstanding balance is cleared.`,
      invoiceId: outstanding[0].id,
      balance,
      currency: outstanding[0].currency,
    };
  }
  if (paidCount === 0) return { released: false, reason: "Unlocks once your invoice is issued and paid." };
  return { released: true, reason: "All invoices paid" };
}
