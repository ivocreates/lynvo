import "server-only";

import { createClient } from "@/lib/supabase/server";
import { INVOICE_INCOME_CATEGORY, fyRange } from "@/lib/accounts";

export type LedgerRow = {
  id: string;
  source: "ledger" | "invoice";
  entry_type: "income" | "expense";
  entry_date: string;
  category: string;
  party_name: string | null;
  party_gstin: string | null;
  description: string | null;
  amount: number;
  gst_amount: number;
  gst_rate: number;
  tds_amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  bill_number: string | null;
  /** For invoice payments: the billing document to link to. */
  document_id?: string;
};

export type InvoiceIssued = { id: string; number: string; issue_date: string; client_name: string; client_gstin: string | null; subtotal: number; discount_amount: number; tax_amount: number; total: number; currency: string };

/**
 * Everything for a financial year: manual ledger entries plus invoice payments
 * (as income). GST collected on a payment is the invoice's tax share of it.
 */
export async function loadFinancialYear(fy: number) {
  const { start, end } = fyRange(fy);
  const supabase = createClient();

  const [ledger, payments, invoices] = await Promise.all([
    supabase.from("ledger_entries").select("*").gte("entry_date", start).lte("entry_date", end).order("entry_date", { ascending: false }),
    supabase
      .from("billing_payments")
      .select("*, billing_documents(id, number, client_name, client_gstin, total, tax_amount)")
      .gte("paid_on", start)
      .lte("paid_on", end)
      .order("paid_on", { ascending: false }),
    supabase
      .from("billing_documents")
      .select("id, number, issue_date, client_name, client_gstin, subtotal, discount_amount, tax_amount, total, currency, status")
      .eq("doc_type", "invoice")
      .not("status", "in", "(draft,cancelled)")
      .gte("issue_date", start)
      .lte("issue_date", end)
      .order("issue_date"),
  ]);

  const rows: LedgerRow[] = ((ledger.data ?? []) as Record<string, any>[]).map((row) => ({
    id: row.id,
    source: "ledger",
    entry_type: row.entry_type,
    entry_date: row.entry_date,
    category: row.category,
    party_name: row.party_name,
    party_gstin: row.party_gstin,
    description: row.description,
    amount: Number(row.amount),
    gst_amount: Number(row.gst_amount),
    gst_rate: Number(row.gst_rate),
    tds_amount: Number(row.tds_amount),
    currency: row.currency,
    payment_method: row.payment_method,
    reference: row.reference,
    bill_number: row.bill_number,
  }));

  for (const row of (payments.data ?? []) as Record<string, any>[]) {
    const doc = row.billing_documents ?? {};
    const settled = Number(row.amount) + Number(row.tds_amount ?? 0);
    const taxShare = Number(doc.total) > 0 ? Number(doc.tax_amount) / Number(doc.total) : 0;
    rows.push({
      id: row.id,
      source: "invoice",
      entry_type: "income",
      entry_date: row.paid_on,
      category: INVOICE_INCOME_CATEGORY,
      party_name: doc.client_name ?? null,
      party_gstin: doc.client_gstin ?? null,
      description: doc.number ? `Payment for ${doc.number}` : "Invoice payment",
      amount: settled,
      gst_amount: Math.round(settled * taxShare * 100) / 100,
      gst_rate: 0,
      tds_amount: Number(row.tds_amount ?? 0),
      currency: row.currency,
      payment_method: row.method,
      reference: row.reference,
      bill_number: doc.number ?? null,
      document_id: doc.id,
    });
  }

  rows.sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  return {
    rows,
    invoices: (invoices.data ?? []) as InvoiceIssued[],
    setupError: ledger.error ? ledger.error.message : null,
  };
}

/** Totals in INR only; other currencies are reported separately so they are never mixed. */
export function summarise(rows: LedgerRow[], invoices: InvoiceIssued[]) {
  const inr = rows.filter((row) => row.currency === "INR");
  const income = inr.filter((row) => row.entry_type === "income");
  const expense = inr.filter((row) => row.entry_type === "expense");
  const sum = (list: LedgerRow[], pick: (row: LedgerRow) => number) => Math.round(list.reduce((total, row) => total + pick(row), 0) * 100) / 100;

  const incomeGross = sum(income, (row) => row.amount);
  const incomeGst = sum(income, (row) => row.gst_amount);
  const expenseGross = sum(expense, (row) => row.amount);
  const expenseGst = sum(expense, (row) => row.gst_amount);
  const inrInvoices = invoices.filter((doc) => doc.currency === "INR");
  const outputGstInvoices = Math.round(inrInvoices.reduce((total, doc) => total + Number(doc.tax_amount), 0) * 100) / 100;
  const outputGstOther = sum(income.filter((row) => row.source === "ledger"), (row) => row.gst_amount);

  return {
    incomeGross,
    incomeNet: Math.round((incomeGross - incomeGst) * 100) / 100,
    expenseGross,
    expenseNet: Math.round((expenseGross - expenseGst) * 100) / 100,
    profit: Math.round((incomeGross - incomeGst - (expenseGross - expenseGst)) * 100) / 100,
    // GST is due when the invoice is issued, so output GST comes from invoices.
    outputGst: Math.round((outputGstInvoices + outputGstOther) * 100) / 100,
    inputGst: expenseGst,
    tdsReceivable: sum(income, (row) => row.tds_amount),
    tdsPayable: sum(expense, (row) => row.tds_amount),
    turnover: Math.round(inrInvoices.reduce((total, doc) => total + Number(doc.subtotal) - Number(doc.discount_amount), 0) * 100) / 100,
    foreign: rows.filter((row) => row.currency !== "INR"),
  };
}
