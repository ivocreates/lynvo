import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import SectionStamp from "@/components/ui/section-stamp";
import QrCode from "@/components/documents/qr-code";
import {
  CERTIFICATE_TYPE_LABELS,
  formatCertificateDate,
  formatPeriod,
  verifyUrl,
  type VerifiedCertificate,
} from "@/lib/certificates";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check the authenticity of a certificate issued by LYNVO.",
};

async function lookup(code: string): Promise<VerifiedCertificate | null> {
  try {
    const supabase = createClient();
    // Reads through a security-definer function: the certificates table itself
    // is never exposed to anonymous clients.
    const { data, error } = await supabase.rpc("verify_certificate", { p_code: code });
    if (error) {
      console.error("[verify] lookup failed:", error.code, error.message);
      return null;
    }
    const rows = (data ?? []) as VerifiedCertificate[];
    return rows[0] ?? null;
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("[verify] lookup threw:", (error as Error).message);
    return null;
  }
}

export default async function VerifyCertificatePage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);
  const certificate = await lookup(code);
  const url = verifyUrl(getSiteUrl("https://lynvo.tech"), code);

  return (
    <div className="container-page py-20">
      <SectionStamp label="VERIFICATION" />

      {!certificate ? (
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold text-ink-900">Certificate not found</h1>
          <p className="mt-4 text-text-primary/80">
            We couldn&apos;t find a certificate with the code{" "}
            <span className="font-mono text-ink-900">{code}</span>. Check the code and try again, or contact
            us if you believe this is an error.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900"
          >
            Contact LYNVO
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_0.6fr] lg:items-start">
          <div>
            {certificate.status === "revoked" ? (
              <p className="inline-flex rounded-card bg-error/10 px-3 py-1.5 font-mono text-xs uppercase text-error">
                Revoked
              </p>
            ) : (
              <p className="inline-flex rounded-card bg-success/10 px-3 py-1.5 font-mono text-xs uppercase text-success">
                Verified · Authentic
              </p>
            )}

            <h1 className="mt-4 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              {certificate.recipient_name}
            </h1>
            <p className="mt-2 text-lg text-text-primary/80">
              {CERTIFICATE_TYPE_LABELS[certificate.cert_type]}
            </p>

            {certificate.status === "revoked" && (
              <p className="mt-4 max-w-xl rounded-card border border-error/30 bg-error/5 p-4 text-sm text-error">
                This certificate has been revoked by LYNVO and should no longer be treated as valid.
              </p>
            )}

            <dl className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
              {[
                ["Role", certificate.role_title],
                ["Department", certificate.department],
                ["Period", formatPeriod(certificate.start_date, certificate.end_date)],
                ["Issued on", formatCertificateDate(certificate.issued_on)],
                ["Code", certificate.code],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label as string} className="rounded-card border border-border bg-surface p-4">
                    <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">{label}</dt>
                    <dd className="mt-2 text-sm font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
            </dl>

            {certificate.summary && (
              <p className="mt-6 max-w-2xl text-sm leading-6 text-text-primary/80">{certificate.summary}</p>
            )}

            {certificate.skills && certificate.skills.length > 0 && (
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-brand-700">
                {certificate.skills.join(" / ")}
              </p>
            )}
          </div>

          <aside className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">THIS RECORD</p>
            <div className="mt-4 flex justify-center rounded-card bg-white p-3">
              <QrCode value={url} size={160} />
            </div>
            <p className="mt-4 break-all text-xs text-text-primary/60">{url}</p>
            <p className="mt-4 text-sm leading-6 text-text-primary/75">
              This page is generated directly from LYNVO&apos;s records. If the details above don&apos;t match
              the document you were shown, treat the document as invalid.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Report a problem →
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
