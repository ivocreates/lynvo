import {
  applyPlaceholders,
  parseDocumentBody,
  DOC_TYPE_HEADINGS,
  type Recipient,
  type StaffDocument,
} from "@/lib/documents";
import type { BillingSettings } from "@/lib/admin/billing";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** A4 letterhead shared by the printable view and the staff reader. */
export default function DocumentLetterhead({
  doc,
  recipient,
  settings,
}: {
  doc: StaffDocument;
  recipient: Recipient | null;
  settings: BillingSettings;
}) {
  const blocks = parseDocumentBody(applyPlaceholders(doc.body, doc, recipient));
  const identifiers = [
    settings.billing_llpin && `LLPIN: ${settings.billing_llpin}`,
    settings.billing_gstin && `GSTIN: ${settings.billing_gstin}`,
  ].filter(Boolean);

  return (
    <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-ink-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-900 pb-5">
        <div>
          {settings.billing_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.billing_logo_url}
              alt={settings.billing_legal_name || "Logo"}
              className="mb-2 h-12 w-auto object-contain"
            />
          ) : (
            <p className="font-display text-2xl font-semibold tracking-tight">
              {settings.billing_brand_name || "LYNVO"}
            </p>
          )}
          <p className="font-display text-base font-semibold">
            {settings.billing_legal_name || "LYNVO LLP"}
          </p>
          {settings.billing_registered_address && (
            <p className="mt-1 whitespace-pre-line text-[12px] text-ink-900/70">
              {settings.billing_registered_address}
            </p>
          )}
          <p className="mt-1 text-[12px] text-ink-900/70">
            {[settings.billing_email, settings.billing_phone, settings.billing_website]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
          {identifiers.length > 0 && (
            <p className="mt-1 text-[12px] text-ink-900/70">{identifiers.join("  ·  ")}</p>
          )}
        </div>

        <div className="text-right">
          <p className="font-display text-xl font-semibold tracking-wide">
            {DOC_TYPE_HEADINGS[doc.doc_type]}
          </p>
          {settings.doc_header_note && (
            <p className="mt-1 text-[12px] text-ink-900/70">{settings.doc_header_note}</p>
          )}
          {doc.reference && (
            <p className="mt-2 text-[12px]">
              <span className="text-ink-900/60">Ref:</span> {doc.reference}
            </p>
          )}
          <p className="text-[12px]">
            <span className="text-ink-900/60">Date:</span> {formatDate(doc.issue_date)}
          </p>
          {doc.effective_from && (
            <p className="text-[12px]">
              <span className="text-ink-900/60">Effective:</span> {formatDate(doc.effective_from)}
              {doc.effective_to ? ` – ${formatDate(doc.effective_to)}` : ""}
            </p>
          )}
        </div>
      </header>

      {recipient && (
        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-900/60">To</p>
          <p className="mt-1 font-semibold">{recipient.display_name ?? recipient.email}</p>
          {recipient.title && <p className="text-[12px] text-ink-900/75">{recipient.title}</p>}
          <p className="text-[12px] text-ink-900/75">{recipient.email}</p>
        </section>
      )}

      <h1 className="mt-6 font-display text-lg font-semibold">{doc.title}</h1>

      <section className="mt-4 space-y-3">
        {blocks.map((block, index) => {
          switch (block.kind) {
            case "heading":
              return (
                <h2 key={index} className="mt-5 font-display text-base font-semibold">
                  {block.text}
                </h2>
              );
            case "subheading":
              return (
                <h3 key={index} className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-ink-900/80">
                  {block.text}
                </h3>
              );
            case "list":
              return (
                <ul key={index} className="list-disc space-y-1 pl-5">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              );
            case "ordered":
              return (
                <ol key={index} className="list-decimal space-y-1 pl-5">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ol>
              );
            default:
              return (
                <p key={index} className="text-justify">
                  {block.text}
                </p>
              );
          }
        })}
      </section>

      <section className="mt-12 flex flex-wrap justify-between gap-10 text-[12px]">
        <div>
          {settings.billing_signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.billing_signature_url} alt="Signature" className="h-14 w-auto object-contain" />
          ) : (
            <div className="h-12" />
          )}
          <p className="w-56 border-t border-ink-900/40 pt-1 font-semibold">
            {settings.doc_signatory_name || "Ivo Pereira"}
          </p>
          <p className="text-ink-900/70">{settings.doc_signatory_title || "Founder & CEO"}</p>
          <p className="text-ink-900/70">{settings.billing_legal_name || "LYNVO LLP"}</p>
        </div>
        {recipient && doc.audience === "individual" && (
          <div>
            <div className="h-12" />
            <p className="w-56 border-t border-ink-900/40 pt-1 font-semibold">
              {recipient.display_name ?? recipient.email}
            </p>
            <p className="text-ink-900/70">
              {doc.acknowledged_at
                ? `Acknowledged ${new Date(doc.acknowledged_at).toLocaleDateString("en-IN")}`
                : "Recipient signature"}
            </p>
          </div>
        )}
        {settings.billing_stamp_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.billing_stamp_url} alt="Company stamp" className="h-20 w-auto object-contain" />
        )}
      </section>

      <footer className="mt-10 border-t-2 border-ink-900 pt-3 text-center text-[11px] text-ink-900/70">
        <p className="whitespace-pre-line">{settings.doc_footer_note}</p>
        <p className="mt-1">
          {[settings.billing_legal_name, settings.billing_website].filter(Boolean).join("  ·  ")}
        </p>
      </footer>
    </article>
  );
}
