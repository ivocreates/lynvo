import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { cycleLabel, cycleMonths, formatMoney, todayIso } from "@/lib/admin/billing";
import { getClientOptions } from "@/lib/admin/catalog";
import PageHeader from "@/components/admin/page-header";
import Flash, { errorText } from "@/components/admin/flash";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SubscriptionForm, { type SubscriptionRecord } from "@/components/admin/subscription-form";
import { deleteSubscription, invoiceSubscription } from "../actions";

type Row = SubscriptionRecord & { clients: { name: string } | null };

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-sand-400/25 text-clay-500",
  cancelled: "bg-border/50 text-text-primary/60",
};

export default async function SubscriptionsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const profile = await requirePermission("billing.manage");
  const isAdmin = hasRole(profile, "admin");
  const today = todayIso();

  const supabase = createClient();
  const [{ data, error }, clients] = await Promise.all([
    supabase
      .from("client_subscriptions")
      .select("*, clients(name)")
      .order("status")
      .order("next_invoice_on", { ascending: true, nullsFirst: false }),
    getClientOptions(),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const active = rows.filter((row) => row.status === "active");
  const due = active.filter((row) => row.next_invoice_on && row.next_invoice_on <= today);

  // Monthly recurring revenue, per currency.
  const mrr = new Map<string, number>();
  for (const row of active) {
    mrr.set(row.currency, (mrr.get(row.currency) ?? 0) + Number(row.amount) / cycleMonths(row.cycle));
  }

  return (
    <div>
      <PageHeader
        stamp="BILLING"
        title="Maintenance & retainers"
        description="Recurring services per client. Raise each period's invoice in one click."
      />
      <Flash success={searchParams.saved ? "Saved." : null} error={errorText(searchParams.error)} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="archive-card p-5">
          <p className="section-stamp">ACTIVE</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{active.length}</p>
        </div>
        <div className="archive-card p-5">
          <p className="section-stamp">MONTHLY RECURRING</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900">
            {mrr.size === 0 ? formatMoney(0, "INR") : [...mrr.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ")}
          </p>
        </div>
        <div className="archive-card p-5">
          <p className="section-stamp">DUE TO INVOICE</p>
          <p className={`mt-2 font-display text-2xl font-semibold ${due.length > 0 ? "text-error" : "text-ink-900"}`}>{due.length}</p>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load subscriptions. Run migration 0028_permissions_billing_workflow.sql.
        </p>
      )}

      <details className="mb-8 rounded-card border border-border bg-surface p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-display text-lg font-semibold text-ink-900">Add a subscription</summary>
        <div className="mt-4">
          <SubscriptionForm clients={clients} redirectTo="/admin/billing/subscriptions" />
        </div>
      </details>

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => {
            const isDue = row.status === "active" && row.next_invoice_on && row.next_invoice_on <= today;
            return (
              <details key={row.id} className={`rounded-card border bg-surface ${isDue ? "border-error/40" : "border-border"}`}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink-900">{row.name}</p>
                    <p className="text-xs text-text-primary/60">
                      <Link href={`/admin/clients/${row.client_id}/account`} className="hover:underline">
                        {row.clients?.name ?? "Client"}
                      </Link>{" "}
                      · {cycleLabel(row.cycle)} · next invoice {row.next_invoice_on ?? "not scheduled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-card px-2 py-1 text-xs capitalize ${STATUS_TONE[row.status] ?? ""}`}>{row.status}</span>
                    <span className="font-medium text-ink-900">{formatMoney(Number(row.amount), row.currency)}</span>
                  </div>
                </summary>
                <div className="space-y-4 border-t border-border p-4">
                  {row.status === "active" && (
                    <form action={invoiceSubscription} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="id" value={row.id} />
                      <label className="flex items-center gap-2 text-sm text-ink-900">
                        <input type="checkbox" name="issue_now" className="h-4 w-4 accent-brand-700" />
                        Issue immediately
                      </label>
                      <button type="submit" className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900">
                        Invoice next period
                      </button>
                    </form>
                  )}
                  <SubscriptionForm clients={clients} subscription={row} redirectTo="/admin/billing/subscriptions" />
                  {isAdmin && (
                    <form action={deleteSubscription}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmSubmit message="Delete this subscription? Past invoices are kept." />
                    </form>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
