import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS, formatMoney, todayIso } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import Flash from "@/components/admin/flash";
import { deletePayment } from "../actions";
import PaymentEditForm from "@/components/admin/payment-edit-form";

type PaymentRow = {
  id: string;
  amount: number;
  tds_amount?: number | null;
  notes: string | null;
  currency: string;
  paid_on: string;
  method: string;
  reference: string | null;
  document_id: string;
  client_id: string | null;
  billing_documents: { number: string; client_name: string } | null;
};

const RANGES = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

function rangeStart(range: string) {
  const today = todayIso();
  if (range === "month") return `${today.slice(0, 7)}-01`;
  if (range === "year") return `${today.slice(0, 4)}-01-01`;
  if (range === "quarter") {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().slice(0, 10);
  }
  return null;
}

export default async function PaymentsPage({ searchParams }: { searchParams: { range?: string; saved?: string; error?: string } }) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");
  const range = RANGES.some((entry) => entry.value === searchParams.range) ? searchParams.range! : "month";
  const start = rangeStart(range);

  const supabase = createClient();
  let query = supabase
    .from("billing_payments")
    .select("*, billing_documents(number, client_name)")
    .order("paid_on", { ascending: false })
    .limit(500);
  if (start) query = query.gte("paid_on", start);

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as PaymentRow[];

  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));

  return (
    <div>
      <PageHeader stamp="BILLING" title="Payments received" description="Every payment recorded against an invoice, with receipts." />
      <Flash success={searchParams.saved ? "Payment updated." : null} error={searchParams.error ? decodeURIComponent(searchParams.error) : null} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/billing/payments?range=${entry.value}`}
            className={`rounded-card px-3 py-1.5 text-sm ${
              range === entry.value ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"
            }`}
          >
            {entry.label}
          </Link>
        ))}
        <p className="ml-auto text-sm text-text-primary/70">
          Total:{" "}
          <span className="font-semibold text-success">
            {totals.size === 0
              ? formatMoney(0, "INR")
              : [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ")}
          </span>
        </p>
      </div>

      {error ? (
        <p className="rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load payments. Run migration 0028_permissions_billing_workflow.sql.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No payments in this period. Record one from an invoice.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas-warm">
              <tr>
                <th className="px-4 py-3 font-medium text-ink-900">Date</th>
                <th className="px-4 py-3 font-medium text-ink-900">Client</th>
                <th className="px-4 py-3 font-medium text-ink-900">Invoice</th>
                <th className="px-4 py-3 font-medium text-ink-900">Method</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top">
                    {row.paid_on}
                    <PaymentEditForm payment={row} redirectTo={`/admin/billing/payments?range=${range}`} />
                  </td>
                  <td className="px-4 py-3">
                    {row.client_id ? (
                      <Link href={`/admin/clients/${row.client_id}/account`} className="hover:underline">
                        {row.billing_documents?.client_name ?? "Client"}
                      </Link>
                    ) : (
                      row.billing_documents?.client_name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/billing/${row.document_id}`} className="text-brand-700 underline">
                      {row.billing_documents?.number ?? "Invoice"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary/80">
                    {PAYMENT_METHOD_LABELS[row.method] ?? row.method}
                    {row.reference ? <span className="block text-xs text-text-primary/60">Ref {row.reference}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">
                    {formatMoney(Number(row.amount), row.currency)}
                    {Number(row.tds_amount ?? 0) > 0 && (
                      <span className="block text-xs font-normal text-text-primary/60">+ {formatMoney(Number(row.tds_amount), row.currency)} TDS</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/print/receipt/${row.id}`} className="text-brand-700 underline">
                        Receipt
                      </Link>
                      {isAdmin && (
                        <form action={deletePayment}>
                          <input type="hidden" name="payment_id" value={row.id} />
                          <input type="hidden" name="redirect_to" value={`/admin/billing/payments?range=${range}`} />
                          <ConfirmSubmit message="Remove this payment? The invoice balance will go back up." label="Remove" />
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
