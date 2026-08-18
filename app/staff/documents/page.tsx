import Link from "next/link";
import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPE_LABELS, type StaffDocument } from "@/lib/documents";
import { CERTIFICATE_TYPE_LABELS, formatPeriod, type Certificate } from "@/lib/certificates";
import { acknowledgeDocument } from "./actions";

export const metadata = { title: "My documents" };

export default async function StaffDocumentsPage() {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const [{ data: docRows }, { data: certRows }] = await Promise.all([
    supabase
      .from("staff_documents")
      .select("*")
      .eq("status", "issued")
      .order("issue_date", { ascending: false }),
    supabase
      .from("certificates")
      .select("*")
      .eq("recipient_id", profile.id)
      .eq("status", "issued")
      .order("issued_on", { ascending: false }),
  ]);

  const docs = (docRows ?? []) as StaffDocument[];
  const certificates = (certRows ?? []) as Certificate[];
  const mine = docs.filter((doc) => doc.recipient_id === profile.id);
  const shared = docs.filter((doc) => doc.recipient_id !== profile.id);

  const renderDoc = (doc: StaffDocument, personal: boolean) => (
    <li key={doc.id} className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-ink-900">{doc.title}</p>
          <p className="mt-1 text-xs text-text-primary/60">
            {DOC_TYPE_LABELS[doc.doc_type]}
            {doc.reference ? ` · ${doc.reference}` : ""} ·{" "}
            {new Date(`${doc.issue_date}T00:00:00`).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/admin/print/document/${doc.id}`}
          className="rounded-card border border-border px-4 py-2 text-sm hover:bg-canvas-warm"
        >
          Read &amp; download
        </Link>
      </div>

      {personal && (
        <div className="mt-4 border-t border-border pt-3">
          {doc.acknowledged_at ? (
            <p className="text-xs text-success">
              Acknowledged on {new Date(doc.acknowledged_at).toLocaleDateString()}.
            </p>
          ) : (
            <form action={acknowledgeDocument} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={doc.id} />
              <button
                type="submit"
                className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
              >
                I have read and accept this
              </button>
              <span className="text-xs text-text-primary/60">Please read the document before acknowledging.</span>
            </form>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div>
      <p className="section-stamp">RECORDS</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">My documents</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Your contract and any company documents shared with you. Use Read &amp; download to open the printable
        version, then save it as PDF.
      </p>

      <section className="mt-8">
        <p className="section-stamp">ADDRESSED TO ME</p>
        {mine.length === 0 ? (
          <p className="mt-4 text-sm text-text-primary/70">Nothing issued to you yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">{mine.map((doc) => renderDoc(doc, true))}</ul>
        )}
      </section>

      {certificates.length > 0 && (
        <section className="mt-10">
          <p className="section-stamp">MY CERTIFICATES</p>
          <ul className="mt-4 space-y-4">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-ink-900">
                      {CERTIFICATE_TYPE_LABELS[certificate.cert_type]}
                    </p>
                    <p className="mt-1 text-xs text-text-primary/60">
                      {certificate.role_title ? `${certificate.role_title} · ` : ""}
                      {formatPeriod(certificate.start_date, certificate.end_date)}
                    </p>
                    <p className="mt-2 font-mono text-xs text-brand-700">{certificate.code}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/print/certificate/${certificate.id}`}
                      className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
                    >
                      Download certificate
                    </Link>
                    <Link
                      href={`/verify/${certificate.code}`}
                      className="rounded-card border border-border px-4 py-2 text-sm hover:bg-canvas-warm"
                    >
                      Public link
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shared.length > 0 && (
        <section className="mt-10">
          <p className="section-stamp">COMPANY DOCUMENTS</p>
          <ul className="mt-4 space-y-4">{shared.map((doc) => renderDoc(doc, false))}</ul>
        </section>
      )}
    </div>
  );
}
