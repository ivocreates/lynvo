import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { formatMoney, todayIso } from "@/lib/admin/billing";
import { advanceTaxSchedule, ayLabel, estimateLlpTax, fyLabel, fyMonths, fyOf, monthLabel } from "@/lib/accounts";
import { loadFinancialYear, summarise } from "@/lib/accounts-data";
import PageHeader from "@/components/admin/page-header";
import AccountsNav from "@/components/admin/accounts-nav";

const inr = (value: number) => formatMoney(value, "INR");

function readFy(value: string | undefined) {
  const current = fyOf(todayIso());
  const year = Number(value);
  return Number.isInteger(year) && year >= 2015 && year <= current + 1 ? year : current;
}

export default async function AccountsOverviewPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requirePermission("accounts");
  const fy = readFy(searchParams.fy);
  const current = fyOf(todayIso());
  const years = Array.from({ length: 4 }, (_, index) => current - 3 + index).filter((year) => year >= 2023).concat(current < fy ? [fy] : []);

  const { rows, invoices, setupError } = await loadFinancialYear(fy);
  const totals = summarise(rows, invoices);
  const tax = estimateLlpTax(totals.profit);
  const schedule = advanceTaxSchedule(fy, tax.total);
  const netGst = Math.round((totals.outputGst - totals.inputGst) * 100) / 100;
  const taxAfterTds = Math.max(0, tax.total - totals.tdsReceivable);

  const months = fyMonths(fy).map((month) => {
    const inMonth = rows.filter((row) => row.currency === "INR" && row.entry_date.startsWith(month));
    const income = inMonth.filter((row) => row.entry_type === "income").reduce((sum, row) => sum + row.amount - row.gst_amount, 0);
    const expense = inMonth.filter((row) => row.entry_type === "expense").reduce((sum, row) => sum + row.amount - row.gst_amount, 0);
    return { month, income, expense, net: income - expense };
  });
  const peak = Math.max(1, ...months.map((month) => Math.max(month.income, month.expense)));

  const byCategory = (type: "income" | "expense") => {
    const map = new Map<string, number>();
    for (const row of rows.filter((entry) => entry.entry_type === type && entry.currency === "INR")) {
      map.set(row.category, (map.get(row.category) ?? 0) + row.amount - row.gst_amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const expenseCategories = byCategory("expense");
  const incomeCategories = byCategory("income");

  const cards = [
    { label: "Income (excl. GST)", value: inr(totals.incomeNet), detail: `${inr(totals.incomeGross)} received incl. GST` },
    { label: "Expenses (excl. GST)", value: inr(totals.expenseNet), detail: `${inr(totals.expenseGross)} paid incl. GST` },
    { label: "Profit before tax", value: inr(totals.profit), tone: totals.profit >= 0 ? "text-success" : "text-error", detail: "income − expenses, cash basis" },
    { label: "Estimated income tax", value: inr(tax.total), detail: `30% + cess${tax.surcharge ? " + surcharge" : ""} · after TDS credit ${inr(taxAfterTds)}` },
  ];

  return (
    <div>
      <PageHeader
        stamp="ACCOUNTS"
        title={`Accounts · ${fyLabel(fy)}`}
        description={`1 April ${fy} – 31 March ${fy + 1} (${ayLabel(fy)}). Invoice payments are included automatically.`}
        action={{ href: `/admin/accounts/ledger?fy=${fy}#add`, label: "Add income / expense" }}
      />
      <AccountsNav active="overview" fy={fy} years={[...new Set(years)].sort()} />

      {setupError && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Manual entries need migration 0033_accounts.sql. Invoice payments are still shown below.
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="archive-card p-5">
            <p className="section-stamp">{card.label.toUpperCase()}</p>
            <p className={`mt-2 font-display text-2xl font-semibold ${card.tone ?? "text-ink-900"}`}>{card.value}</p>
            <p className="mt-1 text-xs text-text-primary/60">{card.detail}</p>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-900">Month by month</h2>
          <p className="text-xs text-text-primary/60">
            <span className="mr-3 inline-block h-2 w-3 rounded-sm bg-success align-middle" /> Income
            <span className="ml-4 mr-1 inline-block h-2 w-3 rounded-sm bg-clay-500 align-middle" /> Expenses (excl. GST)
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {months.map((month) => (
                <tr key={month.month} className="border-b border-border last:border-0">
                  <td className="w-20 py-2 text-text-primary/70">{monthLabel(month.month)}</td>
                  <td className="py-2">
                    <div className="space-y-1" aria-hidden="true">
                      <div className="h-2 rounded-sm bg-success" style={{ width: `${(month.income / peak) * 100}%` }} />
                      <div className="h-2 rounded-sm bg-clay-500" style={{ width: `${(month.expense / peak) * 100}%` }} />
                    </div>
                  </td>
                  <td className="w-28 py-2 text-right text-success">{month.income ? inr(month.income) : "—"}</td>
                  <td className="w-28 py-2 text-right text-clay-500">{month.expense ? inr(month.expense) : "—"}</td>
                  <td className={`w-28 py-2 text-right font-medium ${month.net < 0 ? "text-error" : "text-ink-900"}`}>{month.net ? inr(month.net) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">GST summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-primary/70">Taxable turnover (invoices issued)</dt><dd>{inr(totals.turnover)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-primary/70">Output GST on invoices &amp; other income</dt><dd>{inr(totals.outputGst)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-primary/70">Input GST credit on expenses</dt><dd>− {inr(totals.inputGst)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Net GST {netGst >= 0 ? "payable" : "credit carried forward"}</dt><dd>{inr(Math.abs(netGst))}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-text-primary/60">
            Registration is compulsory once services turnover crosses ₹20 lakh in a year (₹10 lakh in special-category states). Input credit
            only applies to bills with your GSTIN on them.
          </p>
        </section>

        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">TDS</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-primary/70">Deducted by clients (credit in Form 26AS)</dt><dd>{inr(totals.tdsReceivable)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-primary/70">Deducted by LYNVO from vendors (to deposit)</dt><dd>{inr(totals.tdsPayable)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-text-primary/60">
            Match client TDS against Form 26AS / AIS before filing ITR-5. TDS you deduct must be deposited by the 7th of the next month.
          </p>

          <h3 className="mt-6 font-display font-semibold text-ink-900">Income tax estimate</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-text-primary/70">Tax at 30%</dt><dd>{inr(tax.base)}</dd></div>
            {tax.surcharge > 0 && <div className="flex justify-between"><dt className="text-text-primary/70">Surcharge 12%</dt><dd>{inr(tax.surcharge)}</dd></div>}
            <div className="flex justify-between"><dt className="text-text-primary/70">Health &amp; education cess 4%</dt><dd>{inr(tax.cess)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-primary/70">Less TDS already deducted</dt><dd>− {inr(Math.min(tax.total, totals.tdsReceivable))}</dd></div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Estimated tax still to pay</dt><dd>{inr(taxAfterTds)}</dd></div>
          </dl>
        </section>
      </div>

      {tax.total >= 10000 && (
        <section className="mb-8 rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">Advance tax instalments</h2>
          <p className="mt-1 text-xs text-text-primary/60">Due when the year&apos;s tax is ₹10,000 or more. Based on profit recorded so far — re-check each quarter.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-4">
            {schedule.map((entry) => (
              <li key={entry.due} className={`rounded-card border p-3 text-sm ${entry.due < todayIso() ? "border-border opacity-70" : "border-brand-700/40"}`}>
                <p className="text-xs text-text-primary/60">By {entry.due}</p>
                <p className="font-semibold text-ink-900">{inr(entry.cumulative)}</p>
                <p className="text-xs text-text-primary/60">{Math.round(entry.share * 100)}% cumulative</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {[
          { title: "Where the money came from", list: incomeCategories, total: totals.incomeNet },
          { title: "Where the money went", list: expenseCategories, total: totals.expenseNet },
        ].map((block) => (
          <section key={block.title} className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-ink-900">{block.title}</h2>
            {block.list.length === 0 ? (
              <p className="mt-3 text-sm text-text-primary/60">Nothing recorded for {fyLabel(fy)}.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {block.list.map(([category, amount]) => (
                  <li key={category}>
                    <div className="flex justify-between">
                      <Link href={`/admin/accounts/ledger?fy=${fy}&category=${encodeURIComponent(category)}`} className="text-ink-900 hover:underline">
                        {category}
                      </Link>
                      <span>{inr(amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-canvas-warm" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand-700" style={{ width: `${block.total > 0 ? (amount / block.total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {totals.foreign.length > 0 && (
        <p className="mb-6 rounded-card border border-border bg-surface p-4 text-sm text-text-primary/70">
          {totals.foreign.length} entries in other currencies are listed in the ledger but not included in these INR totals. Record the INR
          amount actually credited to your bank for tax purposes.
        </p>
      )}

      <section className="rounded-card border border-border bg-canvas-warm p-5 text-sm text-text-primary/80">
        <p className="font-medium text-ink-900">For your CA</p>
        <p className="mt-1">
          Download the full ledger for {fyLabel(fy)} — every invoice payment and manual entry with GST, TDS, party GSTIN and references — as a
          spreadsheet, plus the GST invoice register.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href={`/admin/accounts/export?fy=${fy}&type=ledger`} className="rounded-card bg-brand-700 px-4 py-2 font-medium text-text-inverse hover:bg-ink-900">
            Ledger CSV
          </a>
          <a href={`/admin/accounts/export?fy=${fy}&type=invoices`} className="rounded-card border border-border px-4 py-2 font-medium text-ink-900 hover:bg-surface">
            Invoice register (GSTR-1) CSV
          </a>
        </div>
        <p className="mt-4 text-xs text-text-primary/60">
          Estimates use cash-basis figures recorded here and the standard LLP rate (30% + 4% cess, 12% surcharge above ₹1 crore). Depreciation,
          disallowances, partner remuneration limits and carried-forward losses are not modelled — your CA prepares the final computation.
        </p>
      </section>
    </div>
  );
}
