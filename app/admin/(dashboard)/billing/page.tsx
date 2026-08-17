import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, hasRole } from "@/lib/auth";
import { formatMoney } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SearchInput from "@/components/admin/search-input";
import { deleteDocument } from "./actions";

type DocumentRow = {
  id: string;
  doc_type: "quote" | "invoice";
  number: string;
  status: string;
  issue_date: string;
  client_name: string;
  currency: string;
  total: number;
};

const TABS = [
  { value: "", label: "All" },
  { value: "quote", label: "Quotes" },
  { value: "invoice", label: "Invoices" },
];

export default async function BillingListPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; saved?: string; deleted?: string };
}) {
  const profile = await requireStaff();
  const canDelete = hasRole(profile, "admin");

  const supabase = createClient();
  let query = supabase
    .from("billing_documents")
    .select("id, doc_type, number, status, issue_date, client_name, currency, total")
    .order("issue_date", { ascending: false })
    .limit(200);

  if (searchParams.type === "quote" || searchParams.type === "invoice") {
    query = query.eq("doc_type", searchParams.type);
  }

  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,()]/g, "");
    query = query.or(`number.ilike.%${term}%,client_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as DocumentRow[];

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title="Quotes & invoices"
        description={`${rows.length} document${rows.length === 1 ? "" : "s"}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/billing/new?type=quote"
          className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          New quote
        </Link>
        <Link
          href="/admin/billing/new?type=invoice"
          className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          New invoice
        </Link>
        <Link
          href="/admin/billing-items"
          className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm"
        >
          Preset items
        </Link>
        <Link
          href="/admin/billing/settings"
          className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm"
        >
          Letterhead settings
        </Link>
      </div>

      {searchParams.saved && (
        <p className="mb-4 rounded-card border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          Saved successfully.
        </p>
      )}
      {searchParams.deleted === "1" && (
        <p className="mb-4 rounded-card border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          Deleted successfully.
        </p>
      )}
      {searchParams.deleted === "0" && (
        <p className="mb-4 rounded-card border border-error/40 bg-error/10 px-4 py-2 text-sm text-error">
          Could not delete that document.
        </p>
      )}

      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => {
          const active = (searchParams.type ?? "") === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/admin/billing?type=${tab.value}` : "/admin/billing"}
              className={`rounded-card px-3 py-1.5 text-sm ${
                active ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <SearchInput placeholder="Search by number or client..." />

      {error ? (
        <p className="rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load documents. Run migration 0006_billing.sql if you have not yet.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-primary/70">No documents yet.</p>
          <Link href="/admin/billing/new?type=quote" className="mt-3 inline-block text-sm text-brand-700 underline">
            Create the first quote
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas-warm">
              <tr>
                <th className="px-4 py-3 font-medium text-ink-900">Number</th>
                <th className="px-4 py-3 font-medium text-ink-900">Type</th>
                <th className="px-4 py-3 font-medium text-ink-900">Client</th>
                <th className="px-4 py-3 font-medium text-ink-900">Issued</th>
                <th className="px-4 py-3 font-medium text-ink-900">Status</th>
                <th className="px-4 py-3 font-medium text-ink-900">Total</th>
                <th className="px-4 py-3 text-right font-medium text-ink-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{row.number}</td>
                  <td className="px-4 py-3 capitalize text-text-primary/85">{row.doc_type}</td>
                  <td className="px-4 py-3 text-text-primary/85">{row.client_name}</td>
                  <td className="px-4 py-3 text-text-primary/85">{row.issue_date}</td>
                  <td className="px-4 py-3 capitalize text-text-primary/85">{row.status}</td>
                  <td className="px-4 py-3 text-text-primary/85">{formatMoney(Number(row.total), row.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/print/billing/${row.id}`} className="text-sm text-brand-700 underline">
                        Print
                      </Link>
                      <Link href={`/admin/billing/${row.id}`} className="text-sm text-brand-700 underline">
                        Edit
                      </Link>
                      {canDelete && (
                        <form action={deleteDocument}>
                          <input type="hidden" name="__id" value={row.id} />
                          <ConfirmSubmit message="Delete this document? This cannot be undone." />
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
