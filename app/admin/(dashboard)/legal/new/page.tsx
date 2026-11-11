import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { clientTemplates, getTemplate } from "@/lib/legal-templates";
import { clientValues, companyValues, initialFieldValues } from "@/lib/legal-autofill";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";
import TemplateFields from "@/components/admin/template-fields";
import SubmitButton from "@/components/admin/submit-button";
import { createAgreement } from "../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function NewAgreementPage({
  searchParams,
}: {
  searchParams: { template?: string; client?: string; engagement?: string; quote?: string; error?: string };
}) {
  await requirePermission("clients.manage");

  const supabase = createClient();
  const template = searchParams.template ? getTemplate(searchParams.template) : undefined;
  const clientId = searchParams.client ?? "";

  const [{ data: clientRows }, { data: engagementRows }, { data: quoteRows }] = await Promise.all([
    supabase.from("clients").select("id, name").neq("status", "archived").order("name"),
    clientId
      ? supabase.from("client_engagements").select("id, title").eq("client_id", clientId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabase
          .from("billing_documents")
          .select("id, number, total, currency, status")
          .eq("client_id", clientId)
          .eq("doc_type", "quote")
          .neq("status", "cancelled")
          .order("issue_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const clients = (clientRows ?? []) as { id: string; name: string }[];
  const engagements = (engagementRows ?? []) as { id: string; title: string }[];
  const quotes = (quoteRows ?? []) as { id: string; number: string; total: number; currency: string; status: string }[];

  // Default to the latest project and the accepted quote so most fields arrive filled in.
  const engagementId = searchParams.engagement ?? engagements[0]?.id ?? "";
  const quoteId = searchParams.quote ?? quotes.find((quote) => quote.status === "accepted")?.id ?? quotes[0]?.id ?? "";

  const ready = template && template.audience === "client" && clientId;
  const [company, client] = ready
    ? await Promise.all([companyValues(), clientValues(clientId, engagementId || null, quoteId || null)])
    : [null, null];

  const values = ready && client ? initialFieldValues(template!, { ...company, ...client.party, ...client.defaults }) : {};

  return (
    <div>
      <PageHeader
        stamp="LEGAL"
        title={template ? template.title : "New agreement"}
        description={template?.description ?? "Choose a template and a client. Everything else fills in automatically."}
      />
      <Flash error={searchParams.error} />

      {/* Step 1: template, client and context. A GET form so the page re-renders with auto-filled fields. */}
      <form method="get" className="mb-8 grid gap-4 rounded-card border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="template" className={LABEL}>
            Template
          </label>
          <select id="template" name="template" defaultValue={template?.key ?? ""} required className={FIELD}>
            <option value="" disabled>
              Choose...
            </option>
            {clientTemplates().map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.category} — {entry.title}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="client" className={LABEL}>
            Client
          </label>
          <select id="client" name="client" defaultValue={clientId} required className={FIELD}>
            <option value="" disabled>
              Choose...
            </option>
            {clients.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        {clientId && (
          <>
            <div className="lg:col-span-2">
              <label htmlFor="engagement" className={LABEL}>
                Project
              </label>
              <select id="engagement" name="engagement" defaultValue={engagementId} className={FIELD}>
                <option value="">None</option>
                {engagements.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="quote" className={LABEL}>
                Quotation
              </label>
              <select id="quote" name="quote" defaultValue={quoteId} className={FIELD}>
                <option value="">None</option>
                {quotes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.number} ({entry.status})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
            {ready ? "Refresh auto-fill" : "Continue"}
          </button>
        </div>
      </form>

      {ready && client && (
        <form action={createAgreement} className="space-y-6 rounded-card border border-border bg-surface p-5">
          <input type="hidden" name="template" value={template!.key} />
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="engagement_id" value={engagementId} />
          <input type="hidden" name="quote_id" value={quoteId} />

          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">Details</h2>
            <p className="mt-1 text-sm text-text-primary/70">
              Pre-filled for {client.party.client_name}. Company details, jurisdiction and signatory come from{" "}
              <Link href="/admin/documents/settings" className="text-brand-700 underline">
                document settings
              </Link>
              . Blank fields print as lines to fill in by hand.
            </p>
          </div>

          <TemplateFields template={template!} values={values} />

          <div className="flex items-center gap-3 border-t border-border pt-5">
            <SubmitButton pendingLabel="Generating...">Generate draft</SubmitButton>
            <Link href="/admin/legal" className="text-sm text-text-primary/70 underline">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
