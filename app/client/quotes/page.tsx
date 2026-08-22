import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/admin/billing";

export const metadata = { robots: { index: false, follow: false } };

type Row = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total: number;
};

const STATUS_TONE: Record<string, string> = {
  sent: "border-brand-700/40 bg-brand-700/10 text-brand-700",
  accepted: "border-success/40 bg-success/10 text-success",
  paid: "border-success/40 bg-success/10 text-success",
  overdue: "border-error/40 bg-error/10 text-error",
};

export default async function ClientQuotesPage() {
  const profile = await requireClient();

  const supabase = createClient();
  const { data } = await supabase
    .from("billing_documents")
    .select("id, doc_type, number, status, issue_date, due_date, currency, total")
    .eq("client_id", profile.client_id)
    .order("issue_date", { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <div>
      <p className="section-stamp">BILLING</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Quotes & invoices</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Everything we have issued to you. Open a document to read the full scope or save it as a PDF.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-primary/70">Nothing here yet.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/client/quotes/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-5 hover:border-brand-700"
              >
                <div>
                  <p className="font-medium text-ink-900">
                    {row.doc_type === "invoice" ? "Invoice" : "Quotation"} {row.number}
                  </p>
                  <p className="mt-1 text-sm text-text-primary/70">
                    Issued {row.issue_date}
                    {row.due_date
                      ? ` · ${row.doc_type === "invoice" ? "due" : "valid until"} ${row.due_date}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-card border px-2.5 py-1 text-xs capitalize ${
                      STATUS_TONE[row.status] ?? "border-border bg-canvas-warm text-text-primary/70"
                    }`}
                  >
                    {row.status}
                  </span>
                  <span className="font-medium text-ink-900">
                    {formatMoney(Number(row.total), row.currency)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
