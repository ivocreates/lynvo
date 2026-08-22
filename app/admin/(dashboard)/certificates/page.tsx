import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import CopyButton from "@/components/admin/copy-button";
import CertificateForm, { type CertificatePerson } from "@/components/admin/certificate-form";
import {
  CERTIFICATE_TYPE_LABELS,
  certificatePrintUrl,
  formatPeriod,
  verifyUrl,
  type Certificate,
} from "@/lib/certificates";
import { createCertificate, issueCertificate, revokeCertificate, deleteCertificate, sendCertificateEmail } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-border/50 text-text-primary/70",
  issued: "bg-success/10 text-success",
  revoked: "bg-error/10 text-error",
};

export default async function CertificatesPage({ searchParams }: { searchParams?: { sent?: string } }) {
  await requireManager();

  const supabase = createClient();
  const [{ data: certRows }, { data: peopleRows }] = await Promise.all([
    supabase.from("certificates").select("*").order("created_at", { ascending: false }).limit(200),
    supabase
      .from("profiles")
      .select("id, display_name, email, title, department, joined_on, ends_on")
      .eq("is_active", true),
  ]);

  const certificates = (certRows ?? []) as Certificate[];
  const people: CertificatePerson[] = ((peopleRows ?? []) as Record<string, any>[]).map((person) => ({
    id: person.id,
    name: person.display_name ?? person.email,
    email: person.email,
    title: person.title,
    department: person.department,
    joined_on: person.joined_on,
    ends_on: person.ends_on,
  }));

  const baseUrl = getSiteUrl("https://lynvo.tech");
  const sentMessage =
    searchParams?.sent === "1"
      ? "Certificate email sent."
      : searchParams?.sent === "0"
        ? "Certificate email could not be sent. Check the recipient email and Resend configuration."
        : "";

  return (
    <div>
      <PageHeader
        stamp="HR"
        title="Certificates"
        description="Issue verifiable internship and experience certificates. Anyone can check one at /verify."
      />

      <CertificateForm people={people} action={createCertificate} />

      {sentMessage && (
        <p
          role="status"
          className={`mb-4 rounded-card border px-4 py-3 text-sm ${
            searchParams?.sent === "1"
              ? "border-success/30 bg-success/5 text-success"
              : "border-error/30 bg-error/5 text-error"
          }`}
        >
          {sentMessage}
        </p>
      )}

      {certificates.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No certificates yet.
        </div>
      ) : (
        <ul className="space-y-4">
          {certificates.map((certificate) => (
            <li key={certificate.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-900">{certificate.recipient_name}</p>
                  <p className="mt-1 text-xs text-text-primary/60">
                    {CERTIFICATE_TYPE_LABELS[certificate.cert_type]}
                    {certificate.role_title ? ` · ${certificate.role_title}` : ""}
                    {formatPeriod(certificate.start_date, certificate.end_date)
                      ? ` · ${formatPeriod(certificate.start_date, certificate.end_date)}`
                      : ""}
                  </p>
                  <p className="mt-2 font-mono text-xs text-brand-700">{certificate.code}</p>
                </div>
                <span
                  className={`rounded-card px-2 py-1 font-mono text-xs uppercase ${
                    STATUS_STYLES[certificate.status] ?? ""
                  }`}
                >
                  {certificate.status}
                </span>
              </div>

              {certificate.revoked_reason && (
                <p className="mt-3 text-sm text-error">Revoked: {certificate.revoked_reason}</p>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
                <Link
                  href={`/admin/print/certificate/${certificate.id}`}
                  className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                >
                  Preview &amp; print
                </Link>

                {certificate.status !== "issued" ? (
                  <form action={issueCertificate}>
                    <input type="hidden" name="id" value={certificate.id} />
                    <button
                      type="submit"
                      className="rounded-card bg-brand-700 px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-ink-900"
                    >
                      {certificate.status === "revoked" ? "Reinstate" : "Mark complete & issue"}
                    </button>
                  </form>
                ) : (
                  <>
                    <CopyButton value={verifyUrl(baseUrl, certificate.code)} label="Copy verify link" />
                    {certificate.recipient_email && (
                      <>
                        <form action={sendCertificateEmail}>
                          <input type="hidden" name="id" value={certificate.id} />
                          <button
                            type="submit"
                            className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                          >
                            Email certificate
                          </button>
                        </form>
                        <a
                          href={`mailto:${certificate.recipient_email}?subject=${encodeURIComponent(
                            `Your LYNVO certificate ${certificate.code}`
                          )}&body=${encodeURIComponent(
                            `Your certificate is ready.\n\nDownload or print: ${certificatePrintUrl(
                              baseUrl,
                              certificate.id
                            )}\nVerify: ${verifyUrl(baseUrl, certificate.code)}`
                          )}`}
                          className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                        >
                          Open mail app
                        </a>
                      </>
                    )}
                    <form action={revokeCertificate} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={certificate.id} />
                      <input
                        name="revoked_reason"
                        placeholder="Reason"
                        aria-label="Revocation reason"
                        className="w-48 rounded-card border border-border bg-canvas-warm px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                      >
                        Revoke
                      </button>
                    </form>
                  </>
                )}

                <form action={deleteCertificate} className="ml-auto">
                  <input type="hidden" name="id" value={certificate.id} />
                  <ConfirmSubmit message="Delete this certificate? Its verification link will stop working." />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
