import Link from "next/link";
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

      <article className="mt-8 space-y-3 rounded-card border border-border bg-surface p-6">
        {blocks.map((block, index) => {
          switch (block.kind) {
            case "heading":
              return (
                <h2 key={index} className="mt-5 font-display text-xl font-semibold text-ink-900">
                  {block.text}
                </h2>
              );
            case "subheading":
              return (
                <h3 key={index} className="mt-4 text-sm font-semibold uppercase tracking-wide text-text-primary/80">
                  {block.text}
                </h3>
              );
            case "list":
              return (
                <ul key={index} className="list-disc space-y-1 pl-5 text-text-primary/80">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              );
            case "ordered":
              return (
                <ol key={index} className="list-decimal space-y-1 pl-5 text-text-primary/80">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ol>
              );
            default:
              return (
                <p key={index} className="leading-7 text-text-primary/80">
                  {block.text}
                </p>
              );
          }
        })}
      </article>
    </div>
  );
}
