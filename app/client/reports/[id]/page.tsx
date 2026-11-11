import Link from "next/link";
import DocumentBody from "@/components/documents/document-body";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseDocumentBody } from "@/lib/documents";
import { formatPeriod, type ClientReport } from "@/lib/clients";

export default async function ClientReportPage({ params }: { params: { id: string } }) {
  const profile = await requireClient();

  const supabase = createClient();
  const { data } = await supabase
    .from("client_reports")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", profile.client_id)
    .maybeSingle();

  if (!data) notFound();
  const report = data as unknown as ClientReport;
  const blocks = parseDocumentBody(report.body);

  return (
    <div className="max-w-3xl">
      <Link href="/client/reports" className="text-sm text-brand-700 underline-offset-4 hover:underline">
        ← All reports
      </Link>

      <p className="section-stamp mt-6">REPORT</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">{report.title}</h1>
      <p className="mt-2 text-sm text-text-primary/60">
        {formatPeriod(report.period_start, report.period_end)}
      </p>

      <article className="mt-8 rounded-card border border-border bg-surface p-6 text-text-primary/85">
        <DocumentBody blocks={blocks} />
      </article>
    </div>
  );
}
