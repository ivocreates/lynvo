import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { HR_DOCUMENT_SETTING_GROUPS } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import BillingSettingsForm from "@/components/admin/billing-settings-form";
import { DOC_TYPE_LABELS, DOC_AUDIENCE_LABELS, type StaffDocument } from "@/lib/documents";
import { saveDocumentSettings } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-border/50 text-text-primary/70",
  issued: "bg-success/10 text-success",
  archived: "bg-sand-400/25 text-clay-500",
};

export default async function DocumentsPage() {
  await requireManager();

  const supabase = createClient();
  const [{ data: docRows }, { data: peopleRows }, settings] = await Promise.all([
    supabase.from("staff_documents").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, display_name, email"),
    getBillingSettings(),
  ]);

  const docs = (docRows ?? []) as StaffDocument[];
  const people = (peopleRows ?? []) as Record<string, any>[];
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const person = people.find((entry) => entry.id === id);
    return person ? person.display_name ?? person.email : "Unknown";
  };

  return (
    <div>
      <PageHeader
        stamp="HR"
        title="Documents"
        description="Contracts, offer letters, NDAs, and policies on the LYNVO letterhead."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/documents/new"
          className="inline-flex rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          New document
        </Link>
        <a href="#document-formatting" className="rounded-card border border-border px-4 py-2 text-sm hover:bg-surface">
          Formatting &amp; partners
        </a>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No documents yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li key={doc.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/documents/${doc.id}`}
                    className="font-display font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {doc.title}
                  </Link>
                  <p className="mt-1 text-xs text-text-primary/60">
                    {DOC_TYPE_LABELS[doc.doc_type]}
                    {doc.reference ? ` · ${doc.reference}` : ""} ·{" "}
                    {nameOf(doc.recipient_id) ?? DOC_AUDIENCE_LABELS[doc.audience]} ·{" "}
                    {new Date(`${doc.issue_date}T00:00:00`).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {doc.acknowledged_at && (
                    <span className="rounded-card bg-brand-700/10 px-2 py-1 font-mono text-xs uppercase text-brand-700">
                      acknowledged
                    </span>
                  )}
                  <span
                    className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${STATUS_STYLES[doc.status] ?? ""}`}
                  >
                    {doc.status}
                  </span>
                  <Link
                    href={`/admin/print/document/${doc.id}`}
                    className="text-sm text-brand-700 underline underline-offset-4"
                  >
                    Print
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section id="document-formatting" className="mt-8 border-t border-border pt-8">
        <PageHeader
          stamp="FORMAT"
          title="Document formatting"
          description="HR document footer text, stamp, and first/second designated partner signatures."
        />
        <BillingSettingsForm
          values={settings}
          groups={HR_DOCUMENT_SETTING_GROUPS}
          action={saveDocumentSettings}
          submitLabel="Save document formatting"
        />
      </section>
    </div>
  );
}
