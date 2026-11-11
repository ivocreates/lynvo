import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { clientTemplates } from "@/lib/legal-templates";
import PageHeader from "@/components/admin/page-header";
import ClientTabs from "@/components/admin/client-tabs";

const TONES: Record<string, string> = {
  draft: "border-border bg-canvas-warm text-text-primary/70",
  sent: "border-brand-700/40 bg-brand-700/10 text-brand-700",
  signed: "border-success/40 bg-success/10 text-success",
  void: "border-border bg-border/40 text-text-primary/50",
};

export default async function ClientLegalPage({ params }: { params: { id: string } }) {
  await requirePermission("clients.manage");

  const supabase = createClient();
  const [{ data: client }, { data: rows }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", params.id).maybeSingle(),
    supabase
      .from("client_agreements")
      .select("id, title, reference, status, issue_date, signed_at, signer_name")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!client) notFound();

  const agreements = (rows ?? []) as {
    id: string;
    title: string;
    reference: string | null;
    status: string;
    issue_date: string;
    signed_at: string | null;
    signer_name: string | null;
  }[];
  const { name } = client as { id: string; name: string };

  return (
    <div>
      <PageHeader stamp="CLIENT" title={name} description="Agreements, consents and handover documents." />
      <ClientTabs clientId={params.id} active="legal" />

      <section className="mb-8">
        <p className="section-stamp mb-3">QUICK CREATE</p>
        <div className="flex flex-wrap gap-2">
          {clientTemplates().map((template) => (
            <Link
              key={template.key}
              href={`/admin/legal/new?template=${template.key}&client=${params.id}`}
              className="rounded-card border border-border bg-surface px-3 py-1.5 text-sm text-ink-900 hover:border-brand-700"
            >
              {template.title}
            </Link>
          ))}
        </div>
      </section>

      {agreements.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No agreements for this client yet.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {agreements.map((agreement) => (
            <li key={agreement.id}>
              <Link href={`/admin/legal/${agreement.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-canvas-warm/60">
                <div>
                  <p className="font-medium text-ink-900">{agreement.title}</p>
                  <p className="text-xs text-text-primary/60">
                    {agreement.reference ?? "—"} · {agreement.issue_date}
                    {agreement.signed_at ? ` · signed by ${agreement.signer_name}` : ""}
                  </p>
                </div>
                <span className={`rounded-card border px-2 py-0.5 text-xs capitalize ${TONES[agreement.status] ?? ""}`}>
                  {agreement.status === "sent" ? "awaiting signature" : agreement.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
