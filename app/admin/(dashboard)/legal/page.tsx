import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { clientTemplates, staffTemplates } from "@/lib/legal-templates";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";

type Row = {
  id: string;
  title: string;
  reference: string | null;
  status: string;
  issue_date: string;
  signed_at: string | null;
  client_id: string;
  clients: { name: string } | null;
};

const AGREEMENT_TONES: Record<string, string> = {
  draft: "border-border bg-canvas-warm text-text-primary/70",
  sent: "border-brand-700/40 bg-brand-700/10 text-brand-700",
  signed: "border-success/40 bg-success/10 text-success",
  void: "border-border bg-border/40 text-text-primary/50",
};

const STATUS_LABEL: Record<string, string> = { draft: "Draft", sent: "Awaiting signature", signed: "Signed", void: "Void" };

export default async function LegalPage({ searchParams }: { searchParams: { status?: string; deleted?: string } }) {
  const profile = await requirePermission("clients.manage");
  const isManager = hasRole(profile, "junior_partner");

  const supabase = createClient();
  let query = supabase
    .from("client_agreements")
    .select("id, title, reference, status, issue_date, signed_at, client_id, clients(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const groups = new Map<string, ReturnType<typeof clientTemplates>>();
  for (const template of clientTemplates()) {
    groups.set(template.category, [...(groups.get(template.category) ?? []), template]);
  }

  return (
    <div>
      <PageHeader
        stamp="LEGAL"
        title="Agreements & legal documents"
        description="Generate client agreements from templates. Client details, project and quote fill in automatically."
      />
      <Flash success={searchParams.deleted ? "Agreement deleted." : null} />

      <section className="mb-10">
        <h2 className="font-display text-lg font-semibold text-ink-900">Client templates</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {[...groups.entries()].map(([category, templates]) => (
            <div key={category}>
              <p className="section-stamp mb-2">{category.toUpperCase()}</p>
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.key}>
                    <Link
                      href={`/admin/legal/new?template=${template.key}`}
                      className="block rounded-card border border-border bg-surface p-4 hover:border-brand-700"
                    >
                      <p className="font-medium text-ink-900">{template.title}</p>
                      <p className="mt-1 text-xs text-text-primary/60">{template.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {isManager && (
          <p className="mt-6 text-sm text-text-primary/70">
            Employment documents (offer letters, payslips, certificates, NDAs and more) live in{" "}
            <Link href="/admin/documents/templates" className="text-brand-700 underline">
              HR documents → templates
            </Link>{" "}
            — {staffTemplates().length} templates.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Issued agreements</h2>
          <div className="flex flex-wrap gap-2">
            {["", "draft", "sent", "signed", "void"].map((status) => (
              <Link
                key={status || "all"}
                href={status ? `/admin/legal?status=${status}` : "/admin/legal"}
                className={`rounded-card px-3 py-1.5 text-sm ${
                  (searchParams.status ?? "") === status ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"
                }`}
              >
                {status ? STATUS_LABEL[status] : "All"}
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            Could not load agreements. Run migration 0029_client_agreements.sql.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
            No agreements yet. Pick a template above.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/legal/${row.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-canvas-warm/60">
                  <div>
                    <p className="font-medium text-ink-900">{row.title}</p>
                    <p className="text-xs text-text-primary/60">
                      {row.clients?.name ?? "Client"} · {row.reference ?? "No reference"} · {row.issue_date}
                    </p>
                  </div>
                  <span className={`rounded-card border px-2 py-0.5 text-xs ${AGREEMENT_TONES[row.status] ?? ""}`}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
