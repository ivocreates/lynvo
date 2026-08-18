import Link from "next/link";
import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/admin/billing";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteStaffQuote } from "./actions";

export const metadata = { title: "My quotes" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-border/50 text-text-primary/70",
  sent: "bg-brand-700/10 text-brand-700",
  accepted: "bg-success/10 text-success",
  paid: "bg-success/10 text-success",
  overdue: "bg-error/10 text-error",
  cancelled: "bg-border/50 text-text-primary/60",
};

export default async function StaffQuotesPage({ searchParams }: { searchParams: { saved?: string } }) {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const { data } = await supabase
    .from("billing_documents")
    .select("id, number, status, client_name, issue_date, total, currency")
    .eq("created_by", profile.id)
    .eq("doc_type", "quote")
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as Record<string, any>[];

  return (
    <div>
      <p className="section-stamp">SALES</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">My quotes</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Prepare a client quote and it goes to the partners for review. Once it&apos;s sent you can still see it
        here, but it can no longer be edited.
      </p>

      {searchParams.saved && (
        <p className="mt-6 rounded-card border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Quote saved and waiting for review.
        </p>
      )}

      <Link
        href="/staff/quotes/new"
        className="mt-6 inline-flex rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
      >
        New quote
      </Link>

      {quotes.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          You haven&apos;t drafted any quotes yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900">{quote.client_name}</p>
                  <p className="mt-1 font-mono text-xs text-text-primary/60">
                    {quote.number} · {new Date(`${quote.issue_date}T00:00:00`).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink-900">
                    {formatMoney(Number(quote.total), quote.currency || "INR")}
                  </span>
                  <span
                    className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${
                      STATUS_STYLES[quote.status] ?? ""
                    }`}
                  >
                    {quote.status}
                  </span>
                </div>
              </div>

              {quote.status === "draft" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  <Link
                    href={`/staff/quotes/${quote.id}`}
                    className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                  >
                    Edit
                  </Link>
                  <form action={deleteStaffQuote}>
                    <input type="hidden" name="__id" value={quote.id} />
                    <ConfirmSubmit message="Delete this draft quote?" />
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
