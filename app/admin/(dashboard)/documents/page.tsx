import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { HR_DOCUMENT_SETTING_GROUPS } from "@/lib/admin/billing";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import BillingSettingsForm from "@/components/admin/billing-settings-form";
import {
  DOC_TYPES,
  DOC_STATUSES,
  DOC_AUDIENCES,
  DOC_TYPE_LABELS,
  DOC_AUDIENCE_LABELS,
  type DocAudience,
  type DocStatus,
  type DocType,
  type StaffDocument,
} from "@/lib/documents";
import { saveDocumentSettings, deleteDocument } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-border/50 text-text-primary/70",
  issued: "bg-success/10 text-success",
  archived: "bg-sand-400/25 text-clay-500",
};

const SIGNATURE_FILTERS = ["pending", "signed"] as const;

function filterLink(
  base: URLSearchParams,
  key: string,
  value: string | undefined
) {
  const params = new URLSearchParams(base.toString());
  if (value) params.set(key, value);
  else params.delete(key);
  const query = params.toString();
  return query ? `/admin/documents?${query}` : "/admin/documents";
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    doc_type?: string;
    audience?: string;
    signature?: string;
    deleted?: string;
    error?: string;
  };
}) {
  await requireManager();

  const { q, status, doc_type: docType, audience, signature } = searchParams;
  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (status) base.set("status", status);
  if (docType) base.set("doc_type", docType);
  if (audience) base.set("audience", audience);
  if (signature) base.set("signature", signature);

  const supabase = createClient();
  let query = supabase.from("staff_documents").select("*").order("created_at", { ascending: false }).limit(200);

  if (q) query = query.or(`title.ilike.%${q}%,reference.ilike.%${q}%`);
  if (status && DOC_STATUSES.includes(status as DocStatus)) query = query.eq("status", status);
  if (docType && DOC_TYPES.includes(docType as DocType)) query = query.eq("doc_type", docType);
  if (audience && DOC_AUDIENCES.includes(audience as DocAudience)) query = query.eq("audience", audience);
  if (signature === "pending") query = query.eq("signature_required", true).is("recipient_signed_at", null);
  if (signature === "signed") query = query.eq("signature_required", true).not("recipient_signed_at", "is", null);

  const [{ data: docRows }, { data: peopleRows }, settings] = await Promise.all([
    query,
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

  const tabClass = (active: boolean) =>
    `rounded-card border px-3 py-1.5 text-xs capitalize ${
      active ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-surface"
    }`;

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

      {searchParams.deleted && (
        <p className="mb-4 rounded-card border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Document deleted.
        </p>
      )}
      {searchParams.error && (
        <p className="mb-4 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not complete that action. Please try again.
        </p>
      )}

      <form action="/admin/documents" className="mb-4 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {docType && <input type="hidden" name="doc_type" value={docType} />}
        {audience && <input type="hidden" name="audience" value={audience} />}
        {signature && <input type="hidden" name="signature" value={signature} />}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title or reference..."
          className="w-full max-w-xs rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        <button type="submit" className="rounded-card border border-border px-3 py-2 text-sm hover:bg-surface">
          Search
        </button>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-text-primary/50">Status</span>
        <Link href={filterLink(base, "status", undefined)} className={tabClass(!status)}>
          All
        </Link>
        {DOC_STATUSES.map((value) => (
          <Link key={value} href={filterLink(base, "status", value)} className={tabClass(status === value)}>
            {value}
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-text-primary/50">Type</span>
        <Link href={filterLink(base, "doc_type", undefined)} className={tabClass(!docType)}>
          All
        </Link>
        {DOC_TYPES.map((value) => (
          <Link key={value} href={filterLink(base, "doc_type", value)} className={tabClass(docType === value)}>
            {DOC_TYPE_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-text-primary/50">Audience</span>
        <Link href={filterLink(base, "audience", undefined)} className={tabClass(!audience)}>
          All
        </Link>
        {DOC_AUDIENCES.map((value) => (
          <Link key={value} href={filterLink(base, "audience", value)} className={tabClass(audience === value)}>
            {DOC_AUDIENCE_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-text-primary/50">Signature</span>
        <Link href={filterLink(base, "signature", undefined)} className={tabClass(!signature)}>
          All
        </Link>
        {SIGNATURE_FILTERS.map((value) => (
          <Link key={value} href={filterLink(base, "signature", value)} className={tabClass(signature === value)}>
            {value}
          </Link>
        ))}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No documents match these filters.
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
                  {doc.signature_required && (
                    <span
                      className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${
                        doc.recipient_signed_at ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}
                    >
                      {doc.recipient_signed_at ? "signed" : "signature pending"}
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
                  <form action={deleteDocument}>
                    <input type="hidden" name="id" value={doc.id} />
                    <ConfirmSubmit message="Delete this document permanently?" />
                  </form>
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
