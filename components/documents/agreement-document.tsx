import { parseDocumentBody } from "@/lib/documents";
import type { BillingSettings } from "@/lib/admin/billing";
import DocumentBody from "./document-body";

export type AgreementRecord = {
  title: string;
  reference: string | null;
  body: string;
  issue_date: string;
  status: string;
  signature_required: boolean;
  signer_name: string | null;
  signer_designation: string | null;
  signed_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Client agreement on the LYNVO letterhead, with the client's e-signature record. */
export default function AgreementDocument({
  agreement,
  clientName,
  settings,
}: {
  agreement: AgreementRecord;
  clientName: string;
  settings: BillingSettings;
}) {
  const blocks = parseDocumentBody(agreement.body);
  const stampUrl = settings.doc_stamp_url || settings.billing_stamp_url;
  const signatureUrl = settings.doc_signature_url || settings.billing_signature_url;

  return (
    <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-ink-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 break-inside-avoid border-b-2 border-ink-900 pb-5">
        <div>
          {settings.billing_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.billing_logo_url} alt={settings.billing_legal_name || "Logo"} className="mb-2 h-12 w-auto object-contain" />
          ) : (
            <p className="font-display text-2xl font-semibold tracking-tight">{settings.billing_brand_name || "LYNVO"}</p>
          )}
          <p className="font-display text-base font-semibold">{settings.billing_legal_name || "LYNVO CREATIVE SOLUTIONS LLP"}</p>
          {settings.billing_registered_address && (
            <p className="mt-1 whitespace-pre-line text-[12px] text-ink-900/70">{settings.billing_registered_address}</p>
          )}
          <p className="mt-1 text-[12px] text-ink-900/70">
            {[settings.billing_email, settings.billing_phone, settings.billing_website].filter(Boolean).join("  ·  ")}
          </p>
          {settings.billing_llpin && <p className="mt-1 text-[12px] text-ink-900/70">LLPIN: {settings.billing_llpin}</p>}
        </div>
        <div className="text-right text-[12px]">
          {agreement.reference && (
            <p>
              <span className="text-ink-900/60">Ref:</span> {agreement.reference}
            </p>
          )}
          <p>
            <span className="text-ink-900/60">Date:</span> {formatDate(agreement.issue_date)}
          </p>
          <p>
            <span className="text-ink-900/60">Client:</span> {clientName}
          </p>
        </div>
      </header>

      <h1 className="mt-6 font-display text-xl font-semibold">{agreement.title}</h1>

      <DocumentBody blocks={blocks} />

      <section className="mt-12 flex flex-wrap items-end justify-between gap-10 break-inside-avoid text-[12px]">
        <div>
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="Signature" className="h-14 w-auto object-contain" />
          ) : (
            <div className="h-12" />
          )}
          <p className="w-56 border-t border-ink-900/40 pt-1 font-semibold">{settings.doc_signatory_name || "Authorised signatory"}</p>
          <p className="text-ink-900/70">{settings.doc_signatory_title}</p>
          <p className="text-ink-900/70">{settings.billing_legal_name}</p>
        </div>

        {agreement.signature_required && (
          <div>
            {agreement.signed_at ? (
              <p className="mb-1 font-display text-lg italic text-brand-700">{agreement.signer_name}</p>
            ) : (
              <div className="h-12" />
            )}
            <p className="w-56 border-t border-ink-900/40 pt-1 font-semibold">{agreement.signer_name || clientName}</p>
            <p className="text-ink-900/70">{agreement.signer_designation || "For " + clientName}</p>
            <p className="text-ink-900/70">
              {agreement.signed_at
                ? `E-signed in the LYNVO client portal on ${new Date(agreement.signed_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}`
                : "Client signature"}
            </p>
          </div>
        )}

        {stampUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stampUrl} alt="Company stamp" className="h-20 w-auto object-contain" />
        )}
      </section>

      <footer className="mt-10 break-inside-avoid border-t-2 border-ink-900 pt-3 text-center text-[11px] text-ink-900/70">
        <p className="whitespace-pre-line">{settings.doc_footer_note}</p>
        <p className="mt-1">{[settings.billing_legal_name, settings.billing_website].filter(Boolean).join("  ·  ")}</p>
      </footer>
    </article>
  );
}
