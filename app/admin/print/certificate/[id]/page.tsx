import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember, hasRole } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PrintButton from "@/components/admin/print-button";
import QrCode from "@/components/documents/qr-code";
import {
  CERTIFICATE_HEADINGS,
  renderCertificateBody,
  formatCertificateDate,
  formatPeriod,
  verifyUrl,
  type Certificate,
} from "@/lib/certificates";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CertificatePrintPage({ params }: { params: { id: string } }) {
  const profile = await requireTeamMember();

  const supabase = createClient();
  // RLS: managers see drafts, recipients see only their own issued certificate.
  const { data } = await supabase.from("certificates").select("*").eq("id", params.id).maybeSingle();

  if (!data) notFound();
  const certificate = data as unknown as Certificate;

  const [settings] = await Promise.all([getBillingSettings()]);
  const url = verifyUrl(getSiteUrl("https://lynvo.tech"), certificate.code);
  const isManager = hasRole(profile, "junior_partner");
  const period = formatPeriod(certificate.start_date, certificate.end_date);
  const brand = settings.billing_brand_name || "LYNVO";
  const body = renderCertificateBody({
    template: settings.certificate_body_template,
    certificate,
    brand,
    period,
  });
  const layout = settings.certificate_layout === "compact" ? "compact" : "classic";
  const stampUrl = settings.certificate_stamp_url || settings.billing_stamp_url;
  const signatures = [
    {
      url: settings.certificate_signature_url || settings.billing_signature_url,
      name: settings.certificate_partner_name || settings.doc_signatory_name || "Ivo Pereira",
      title: settings.certificate_partner_title || settings.doc_signatory_title || "Founder & Designated Partner",
    },
    settings.certificate_second_signature_url || settings.certificate_second_partner_name || settings.certificate_second_partner_title
      ? {
          url: settings.certificate_second_signature_url,
          name: settings.certificate_second_partner_name || "Co-Founder",
          title: settings.certificate_second_partner_title || "Co-Founder & Designated Partner",
        }
      : null,
  ].filter(Boolean) as { url: string; name: string; title: string }[];

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="mx-auto mb-6 flex max-w-[297mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link
          href={isManager ? "/admin/certificates" : "/staff/documents"}
          className="text-sm text-brand-700 underline"
        >
          Back
        </Link>
        {certificate.status !== "issued" && (
          <p className="text-sm text-clay-500">
            This certificate is a {certificate.status} and is not publicly verifiable yet.
          </p>
        )}
        <PrintButton />
      </div>

      <article className="relative mx-auto flex min-h-[190mm] max-w-[297mm] flex-col bg-white p-12 text-ink-900 shadow-sm print:max-w-none print:p-6 print:shadow-none">
        <div className="pointer-events-none absolute inset-4 border-4 border-double border-brand-700/30" />

        <header className="relative flex items-start justify-between gap-6">
          <div>
            {settings.billing_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.billing_logo_url}
                alt={settings.billing_legal_name || "LYNVO"}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <p className="font-display text-2xl font-semibold tracking-tight">
                {settings.billing_brand_name || "LYNVO"}
              </p>
            )}
            <p className="mt-1 text-[12px] text-ink-900/70">
              {settings.billing_legal_name || "LYNVO LLP"}
            </p>
          </div>
          <div className="text-right text-[12px] text-ink-900/70">
            <p className="font-mono">{certificate.code}</p>
            {certificate.issued_on && <p>Issued {formatCertificateDate(certificate.issued_on)}</p>}
          </div>
        </header>

        {settings.certificate_content_stamp && (
          <p className="pointer-events-none absolute inset-x-0 top-[42%] text-center font-display text-7xl font-semibold uppercase tracking-[0.18em] text-brand-700/5">
            {settings.certificate_content_stamp}
          </p>
        )}

        <div className={`relative flex-1 text-center ${layout === "compact" ? "mt-6" : "mt-10"}`}>
          <p className="font-display text-3xl font-semibold tracking-[0.12em] text-brand-700">
            {CERTIFICATE_HEADINGS[certificate.cert_type]}
          </p>

          <p className={`${layout === "compact" ? "mt-6" : "mt-10"} text-[13px] uppercase tracking-[0.3em] text-ink-900/60`}>
            {settings.certificate_intro || "This is to certify that"}
          </p>

          <p className="mt-4 font-display text-4xl font-semibold">{certificate.recipient_name}</p>

          <p className="mx-auto mt-6 max-w-3xl text-[14px] leading-7 text-ink-900/85">
            {body}
          </p>

          {certificate.summary && (
            <p className="mx-auto mt-5 max-w-3xl text-[13px] leading-6 text-ink-900/75">
              {certificate.summary}
            </p>
          )}

          {certificate.skills && certificate.skills.length > 0 && (
            <p className="mx-auto mt-5 max-w-3xl text-[12px] uppercase tracking-[0.18em] text-brand-700">
              {certificate.skills.join("  ·  ")}
            </p>
          )}
        </div>

        <footer className="relative mt-10 grid grid-cols-[1fr_auto_1fr] items-end gap-6">
          <div className="flex flex-wrap gap-5 text-[12px]">
            {signatures.map((signature) => (
              <div key={`${signature.name}-${signature.title}`}>
                {signature.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signature.url} alt="Signature" className="h-12 w-auto object-contain" />
                ) : (
                  <div className="h-10" />
                )}
                <p className="w-48 border-t border-ink-900/40 pt-1 font-semibold">{signature.name}</p>
                <p className="text-ink-900/70">{signature.title}</p>
              </div>
            ))}
          </div>

          {stampUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stampUrl} alt="Company stamp" className="h-20 w-auto object-contain" />
          )}

          <div className="flex items-center justify-end gap-4 text-left">
            <QrCode value={url} size={104} />
            <div className="max-w-[220px] text-[11px] leading-5 text-ink-900/70">
              <p className="font-semibold text-ink-900">Verify this certificate</p>
              <p className="mt-1 break-all">{url}</p>
              <p className="mt-1">{settings.certificate_note}</p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
