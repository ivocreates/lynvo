import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeriod, type ClientReport } from "@/lib/clients";

export const metadata = { title: "Reports" };

export default async function ClientReportsPage() {
  const profile = await requireClient();

  const supabase = createClient();
  const { data } = await supabase
    .from("client_reports")
    .select("*")
    .eq("client_id", profile.client_id)
    .order("published_at", { ascending: false });

  const reports = (data ?? []) as ClientReport[];

  return (
    <div>
      <p className="section-stamp">REPORTS</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Progress reports</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Written summaries of what we shipped, what changed, and what&apos;s next.
      </p>

      {reports.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No reports published yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/client/reports/${report.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-5 hover:bg-canvas-warm"
              >
                <span className="font-display font-semibold text-ink-900">{report.title}</span>
                <span className="text-xs text-text-primary/60">
                  {formatPeriod(report.period_start, report.period_end)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
