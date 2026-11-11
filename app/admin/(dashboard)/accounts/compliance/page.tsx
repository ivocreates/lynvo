import { requirePermission } from "@/lib/auth";
import { todayIso } from "@/lib/admin/billing";
import { complianceCalendar, fyLabel, fyOf } from "@/lib/accounts";
import PageHeader from "@/components/admin/page-header";
import AccountsNav from "@/components/admin/accounts-nav";

const AUTHORITY_TONE: Record<string, string> = {
  MCA: "bg-brand-700/10 text-brand-700",
  "Income Tax": "bg-clay-500/15 text-clay-500",
  GST: "bg-success/10 text-success",
  TDS: "bg-warning/15 text-warning",
};

const CONDITIONS: Record<string, string> = {
  gst: "If GST-registered",
  tds: "If you deduct TDS",
  audit: "If a tax audit applies",
  no_audit: "If no tax audit",
};

export default async function CompliancePage({ searchParams }: { searchParams: { fy?: string; show?: string } }) {
  await requirePermission("accounts");
  const today = todayIso();
  const current = fyOf(today);
  const requested = Number(searchParams.fy);
  const fy = Number.isInteger(requested) && requested >= 2015 && requested <= current + 1 ? requested : current;
  const years = [current - 1, current, current + 1];

  const showMonthly = searchParams.show === "all";
  const items = complianceCalendar(fy).filter((item) => showMonthly || !(item.authority === "GST" && /GSTR-(1|3B) for/.test(item.title)) && !(item.authority === "TDS" && item.title.startsWith("Deposit")));
  const upcoming = items.filter((item) => item.due >= today);
  const past = items.filter((item) => item.due < today);

  return (
    <div>
      <PageHeader
        stamp="ACCOUNTS"
        title="LLP compliance calendar"
        description={`Statutory filings and payments for ${fyLabel(fy)}. Dates are the standard due dates; the government sometimes extends them.`}
      />
      <AccountsNav active="compliance" fy={fy} years={years} />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <a href={`/admin/accounts/compliance?fy=${fy}${showMonthly ? "" : "&show=all"}`} className="rounded-card border border-border px-3 py-1.5 hover:bg-canvas-warm">
          {showMonthly ? "Hide monthly GST / TDS dates" : "Show monthly GST / TDS dates"}
        </a>
      </div>

      {[
        { title: "Coming up", list: upcoming },
        { title: "Already due", list: past },
      ].map((block) =>
        block.list.length === 0 ? null : (
          <section key={block.title} className="mb-8">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{block.title}</h2>
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {block.list.map((item) => {
                const days = Math.round((Date.parse(item.due) - Date.parse(today)) / 86_400_000);
                return (
                  <li key={`${item.due}-${item.title}`} className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm ${item.due < today ? "opacity-60" : ""}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">
                        <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] ${AUTHORITY_TONE[item.authority]}`}>{item.authority}</span>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-text-primary/60">
                        {item.detail}
                        {item.condition ? ` · ${CONDITIONS[item.condition]}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ink-900">
                        {new Date(`${item.due}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {item.due >= today && (
                        <p className={`text-xs ${days <= 14 ? "text-error" : "text-text-primary/60"}`}>{days === 0 ? "today" : `in ${days} days`}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )
      )}

      <section className="rounded-card border border-border bg-canvas-warm p-5 text-sm text-text-primary/80">
        <p className="font-medium text-ink-900">Keep ready for your CA every year</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Bank statements for every LYNVO account (April to March)</li>
          <li>Sales invoice register and payment receipts (Billing → export)</li>
          <li>Purchase bills with LYNVO&apos;s GSTIN for input credit</li>
          <li>Form 26AS / AIS showing TDS deducted by clients</li>
          <li>Partner capital contributions, drawings and remuneration</li>
          <li>Fixed-asset purchases (laptops, equipment) for depreciation</li>
          <li>Payroll, stipend and contractor payment records with TDS challans</li>
        </ul>
        <p className="mt-3 text-xs text-text-primary/60">
          Late fees: LLP Forms 8 and 11 attract ₹100 per day of delay; late ITR and GST returns carry their own fees and interest.
        </p>
      </section>
    </div>
  );
}
