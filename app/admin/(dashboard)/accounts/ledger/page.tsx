import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS, formatMoney, todayIso } from "@/lib/admin/billing";
import { fyLabel, fyMonths, fyOf, monthLabel } from "@/lib/accounts";
import { loadFinancialYear } from "@/lib/accounts-data";
import PageHeader from "@/components/admin/page-header";
import AccountsNav from "@/components/admin/accounts-nav";
import Flash from "@/components/admin/flash";
import LedgerForm from "@/components/admin/ledger-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteLedgerEntry } from "../actions";

const FILTER = "rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: { fy?: string; type?: string; category?: string; month?: string; source?: string; q?: string; saved?: string; deleted?: string; error?: string };
}) {
  await requirePermission("accounts");
  const current = fyOf(todayIso());
  const requested = Number(searchParams.fy);
  const fy = Number.isInteger(requested) && requested >= 2015 && requested <= current + 1 ? requested : current;
  const years = [current - 3, current - 2, current - 1, current].filter((year) => year >= 2023);

  const { rows, setupError } = await loadFinancialYear(fy);
  const term = (searchParams.q ?? "").trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!searchParams.type || row.entry_type === searchParams.type) &&
      (!searchParams.category || row.category === searchParams.category) &&
      (!searchParams.month || row.entry_date.startsWith(searchParams.month)) &&
      (!searchParams.source || row.source === searchParams.source) &&
      (!term || `${row.party_name ?? ""} ${row.description ?? ""} ${row.reference ?? ""} ${row.bill_number ?? ""}`.toLowerCase().includes(term))
  );

  const inrRows = filtered.filter((row) => row.currency === "INR");
  const totalIn = inrRows.filter((row) => row.entry_type === "income").reduce((sum, row) => sum + row.amount, 0);
  const totalOut = inrRows.filter((row) => row.entry_type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const categories = [...new Set(rows.map((row) => row.category))].sort();
  const here = `/admin/accounts/ledger?${new URLSearchParams(
    Object.entries({ fy: String(fy), type: searchParams.type ?? "", category: searchParams.category ?? "", month: searchParams.month ?? "", source: searchParams.source ?? "", q: searchParams.q ?? "" }).filter(([, value]) => value)
  ).toString()}`;

  return (
    <div>
      <PageHeader
        stamp="ACCOUNTS"
        title="Income & expenses"
        description="Your books: invoice payments come in automatically; add everything else here, including past years."
      />
      <AccountsNav active="ledger" fy={fy} years={years} />
      <Flash
        success={searchParams.saved ? "Saved." : searchParams.deleted ? "Entry deleted." : null}
        error={searchParams.error ? decodeURIComponent(searchParams.error) : setupError ? "Manual entries need migration 0033_accounts.sql." : null}
      />

      <details id="add" className="mb-6 rounded-card border border-border bg-surface p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-display text-lg font-semibold text-ink-900">Add income or expense</summary>
        <p className="mt-2 text-sm text-text-primary/70">
          Pick any date to back-fill earlier months or years. Keep the bill — your CA needs it for GST input credit.
        </p>
        <div className="mt-4">
          <LedgerForm redirectTo={here} />
        </div>
      </details>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="fy" value={fy} />
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search party, description, reference..." className={`${FILTER} min-w-[14rem] flex-1`} />
        <select name="type" defaultValue={searchParams.type ?? ""} className={FILTER} aria-label="Type">
          <option value="">Income &amp; expenses</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select name="category" defaultValue={searchParams.category ?? ""} className={FILTER} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select name="month" defaultValue={searchParams.month ?? ""} className={FILTER} aria-label="Month">
          <option value="">Whole {fyLabel(fy)}</option>
          {fyMonths(fy).map((month) => (
            <option key={month} value={month}>
              {monthLabel(month)}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={searchParams.source ?? ""} className={FILTER} aria-label="Source">
          <option value="">All sources</option>
          <option value="invoice">Invoice payments</option>
          <option value="ledger">Manual entries</option>
        </select>
        <button type="submit" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
          Filter
        </button>
        <Link href={`/admin/accounts/ledger?fy=${fy}`} className="text-sm text-text-primary/60 underline">
          Reset
        </Link>
      </form>

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <p>
          In: <span className="font-semibold text-success">{formatMoney(totalIn, "INR")}</span>
        </p>
        <p>
          Out: <span className="font-semibold text-clay-500">{formatMoney(totalOut, "INR")}</span>
        </p>
        <p>
          Net: <span className="font-semibold text-ink-900">{formatMoney(totalIn - totalOut, "INR")}</span>
        </p>
        <p className="text-text-primary/60">{filtered.length} entries · incl. GST</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">Nothing recorded for these filters.</div>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {filtered.map((row) => (
            <li key={`${row.source}-${row.id}`} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">
                    {row.party_name ?? row.description ?? row.category}
                    <span className="ml-2 rounded-full bg-canvas-warm px-2 py-0.5 text-[11px] font-normal text-text-primary/70">{row.category}</span>
                  </p>
                  <p className="text-xs text-text-primary/60">
                    {row.entry_date} · {PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method}
                    {row.description && row.party_name ? ` · ${row.description}` : ""}
                    {row.bill_number ? ` · bill ${row.bill_number}` : ""}
                    {row.reference ? ` · ref ${row.reference}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${row.entry_type === "income" ? "text-success" : "text-clay-500"}`}>
                    {row.entry_type === "income" ? "+" : "−"} {formatMoney(row.amount, row.currency)}
                  </p>
                  <p className="text-xs text-text-primary/60">
                    {row.gst_amount > 0 ? `GST ${formatMoney(row.gst_amount, row.currency)}` : "no GST"}
                    {row.tds_amount > 0 ? ` · TDS ${formatMoney(row.tds_amount, row.currency)}` : ""}
                  </p>
                </div>
              </div>
              {row.source === "invoice" ? (
                <Link href={`/admin/billing/${row.document_id}`} className="mt-1 inline-block text-xs text-brand-700 underline">
                  Open invoice to edit this payment
                </Link>
              ) : (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-brand-700 underline">Edit</summary>
                  <div className="mt-3 rounded-card border border-border bg-canvas-warm/50 p-4">
                    <LedgerForm entry={row} redirectTo={here} />
                    <form action={deleteLedgerEntry} className="mt-3">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="redirect_to" value={here} />
                      <ConfirmSubmit message="Delete this entry?" />
                    </form>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
