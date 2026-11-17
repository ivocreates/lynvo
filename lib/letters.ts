/** Client-safe letter constants and helpers. Mirrors migrations/0003_letters.sql. */

import type { BillingSettings } from "@/lib/admin/billing";

export type PlacementKind = "signature" | "stamp" | "image";

export type Placement = {
  id: string;
  kind: PlacementKind;
  src: string;
  /** Millimetres from the left of the sheet (anchor null) or of the signature area. */
  x: number;
  /** Millimetres from the top of the sheet (anchor null) or of the signature area. */
  y: number;
  /** Width in millimetres; height follows the image. */
  w: number;
  rotate: number;
  /** null = fixed on the page; n = attached to the n-th [[signature]] area. */
  anchor: number | null;
};

export type Letter = {
  id: string;
  title: string;
  reference: string | null;
  letter_date: string;
  recipient: string | null;
  subject: string | null;
  body: string;
  placements: Placement[];
  show_letterhead: boolean;
  status: "draft" | "final";
  created_at?: string;
  updated_at?: string;
};

/** A4 geometry, shared by the editor and the print view so positions match exactly. */
export const SHEET = {
  widthMm: 210,
  heightMm: 297,
  padTopMm: 14,
  padXMm: 18,
  /** Bottom page margin; on paper page 1 ends here. */
  padBottomMm: 16,
  /** Height reserved by a [[signature]] marker. */
  signoffMm: 24,
} as const;

export const PX_PER_MM = 96 / 25.4;

/** Lines that split the body: [[signature]] reserves space for a signature and stamp. */
export const SIGNOFF_MARKER = /^\[\[\s*(signature|sign|signoff)\s*\]\]$/i;
export const PAGEBREAK_MARKER = /^\[\[\s*page(\s*break)?\s*\]\]$/i;

export type LetterAsset = { key: string; kind: PlacementKind; label: string; src: string; width: number };

/** Signatures and stamps already uploaded under Settings, deduplicated. */
export function letterAssets(settings: BillingSettings): LetterAsset[] {
  const candidates: (LetterAsset | null)[] = [
    (settings.doc_signature_url || settings.billing_signature_url)
      ? {
          key: "sig1",
          kind: "signature",
          label: `Signature · ${settings.doc_signatory_name || "Founder"}`,
          src: settings.doc_signature_url || settings.billing_signature_url,
          width: 45,
        }
      : null,
    settings.doc_second_signature_url
      ? {
          key: "sig2",
          kind: "signature",
          label: `Signature · ${settings.doc_second_signatory_name || "Co-founder"}`,
          src: settings.doc_second_signature_url,
          width: 45,
        }
      : null,
    settings.doc_stamp_url ? { key: "stamp1", kind: "stamp", label: "Company stamp", src: settings.doc_stamp_url, width: 32 } : null,
    settings.billing_stamp_url ? { key: "stamp2", kind: "stamp", label: "Billing stamp", src: settings.billing_stamp_url, width: 32 } : null,
    settings.certificate_stamp_url ? { key: "stamp3", kind: "stamp", label: "Seal", src: settings.certificate_stamp_url, width: 32 } : null,
  ];
  const seen = new Set<string>();
  return candidates.filter((asset): asset is LetterAsset => {
    if (!asset || seen.has(asset.src)) return false;
    seen.add(asset.src);
    return true;
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export { formatDate as formatLetterDate };

export const LETTER_PLACEHOLDERS = [
  { token: "{{date}}", help: "Letter date" },
  { token: "{{reference}}", help: "Reference number" },
  { token: "{{company}}", help: "Legal name, e.g. LYNVO LLP" },
  { token: "{{address}}", help: "Registered address" },
  { token: "{{gstin}}", help: "GSTIN" },
  { token: "{{llpin}}", help: "LLPIN" },
  { token: "{{email}}", help: "Company email" },
  { token: "{{phone}}", help: "Company phone" },
  { token: "{{signatory}}", help: "First designated partner" },
  { token: "{{signatory_title}}", help: "Their title" },
  { token: "{{signatory2}}", help: "Second designated partner" },
  { token: "{{signatory2_title}}", help: "Their title" },
];

/** Replaces {{token}} placeholders. Unknown tokens are left as typed. */
export function fillLetter(text: string, letter: Pick<Letter, "letter_date" | "reference">, settings: BillingSettings) {
  const values: Record<string, string> = {
    date: formatDate(letter.letter_date),
    today: formatDate(new Date().toISOString().slice(0, 10)),
    reference: letter.reference ?? "",
    company: settings.billing_legal_name || "LYNVO LLP",
    brand: settings.billing_brand_name || "LYNVO",
    address: settings.billing_registered_address ?? "",
    gstin: settings.billing_gstin ?? "",
    llpin: settings.billing_llpin ?? "",
    email: settings.billing_email ?? "",
    phone: settings.billing_phone ?? "",
    website: settings.billing_website ?? "",
    signatory: settings.doc_signatory_name || "Ivo Pereira",
    signatory_title: settings.doc_signatory_title || "Founder & Designated Partner",
    signatory2: settings.doc_second_signatory_name || "",
    signatory2_title: settings.doc_second_signatory_title || "",
  };
  // A detail that isn't filled in under Settings shows as [gstin] so the gap is visible before printing.
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => (key in values ? values[key] || `[${key.replace(/_/g, " ")}]` : match));
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number * 10) / 10)) : fallback;
};

/** Only our own media or https images can be placed on a letter. */
export const isPlacementSrc = (src: unknown): src is string =>
  typeof src === "string" && src.length <= 500 && (/^\/media\/[\w\-./]+$/.test(src) || /^https:\/\/[^\s"'<>]+$/.test(src)) && !src.includes("..");

/** Validates placements from the editor (or the database) into a safe shape. */
export function sanitizePlacements(input: unknown): Placement[] {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 20)
    .filter((entry) => entry && typeof entry === "object" && isPlacementSrc((entry as Placement).src))
    .map((entry, index) => {
      const item = entry as Partial<Placement>;
      const kind: PlacementKind = item.kind === "signature" || item.kind === "stamp" ? item.kind : "image";
      const anchor = item.anchor === null || item.anchor === undefined ? null : clamp(item.anchor, 0, 9, 0);
      return {
        id: typeof item.id === "string" && /^[\w-]{1,40}$/.test(item.id) ? item.id : `p${index}`,
        kind,
        src: item.src as string,
        x: clamp(item.x, -40, 250, 0),
        y: clamp(item.y, -40, 2000, 0),
        w: clamp(item.w, 8, 190, 40),
        rotate: clamp(item.rotate, -45, 45, 0),
        anchor: anchor === null ? null : Math.round(anchor),
      };
    });
}

const SIGN_OFF = `Yours faithfully,
For **{{company}}**

[[signature]]

**{{signatory}}**
{{signatory_title}}`;

export type LetterTemplate = {
  key: string;
  label: string;
  description: string;
  title: string;
  recipient: string;
  subject: string;
  body: string;
};

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    key: "blank",
    label: "Blank letter",
    description: "Letterhead, date and a sign-off. Write anything.",
    title: "Letter",
    recipient: "To,\nThe Manager\n",
    subject: "",
    body: `Dear Sir / Madam,

Write your letter here. Use **bold**, *italic*, lists and tables.

${SIGN_OFF}`,
  },
  {
    key: "bank_current_account",
    label: "Bank · Open current account",
    description: "Request to open a current account and name the authorised signatories.",
    title: "Current account opening request",
    recipient: "To,\nThe Branch Manager\n[Bank name], [Branch]\n[City] – [PIN]",
    subject: "Request to open a current account in the name of {{company}}",
    body: `Dear Sir / Madam,

We, **{{company}}**, a Limited Liability Partnership registered under the LLP Act, 2008 (LLPIN: {{llpin}}), request you to open a current account in the name of the firm at your branch.

The following designated partners are authorised to operate the account:

| Name | Designation | Mode of operation |
| --- | --- | --- |
| {{signatory}} | {{signatory_title}} | Singly |
| {{signatory2}} | {{signatory2_title}} | Singly |

We enclose the following documents for KYC:

1. Certificate of Incorporation and LLP Agreement
2. PAN card of the LLP
3. GST registration certificate (GSTIN: {{gstin}})
4. KYC documents of the designated partners
5. Proof of registered office address

Kindly process the account opening at the earliest. Please contact us at {{email}} / {{phone}} for any further information.

${SIGN_OFF}`,
  },
  {
    key: "bank_authority",
    label: "Bank · Letter of authority",
    description: "Authorise a person to submit documents or collect a cheque book / statement.",
    title: "Letter of authority to the bank",
    recipient: "To,\nThe Branch Manager\n[Bank name], [Branch]\n[City]",
    subject: "Letter of authority – Current account no. [XXXXXXXXXX]",
    body: `Dear Sir / Madam,

We hereby authorise **[Name of person]**, holding [ID type] no. [ID number], to visit your branch on our behalf to:

- submit documents relating to our current account no. [XXXXXXXXXX];
- collect the cheque book / debit card / account statement for the period [from] to [to].

The specimen signature of the authorised person is given below for verification.

| | |
| --- | --- |
| Name | [Name of person] |
| Specimen signature | |

Please extend your cooperation to the authorised person. This authority is valid until [date].

${SIGN_OFF}`,
  },
  {
    key: "bank_statement",
    label: "Bank · Statement / balance certificate",
    description: "Ask the bank for a statement, balance certificate or interest certificate.",
    title: "Request for account statement",
    recipient: "To,\nThe Branch Manager\n[Bank name], [Branch]\n[City]",
    subject: "Request for account statement and balance certificate – A/c no. [XXXXXXXXXX]",
    body: `Dear Sir / Madam,

We request you to issue the following for our current account no. **[XXXXXXXXXX]** held in the name of **{{company}}**:

1. Account statement for the period [01 April 2026] to [31 March 2027]
2. Balance certificate as on [date]

Kindly debit any applicable charges to the same account. The documents may be emailed to {{email}} or handed over to our authorised representative.

${SIGN_OFF}`,
  },
  {
    key: "airtel_business_sim",
    label: "Airtel · Business SIM request",
    description: "Request corporate / business postpaid connections and authorise a representative.",
    title: "Airtel business SIM request",
    recipient: "To,\nThe Relationship Manager\nBharti Airtel Limited – Airtel Business\n[City]",
    subject: "Request for business (corporate) postpaid mobile connections for {{company}}",
    body: `Dear Sir / Madam,

**{{company}}** (GSTIN: {{gstin}}, LLPIN: {{llpin}}) requests the issue of business postpaid mobile connections under a corporate account in the name of the firm. Registered office: {{address}}.

Please issue connections to the following users:

| # | User name | Designation | Plan | Existing no. (if MNP) |
| --- | --- | --- | --- | --- |
| 1 | [Name] | [Designation] | [Plan] | — |
| 2 | [Name] | [Designation] | [Plan] | — |

We authorise **[Name of authorised signatory]**, [designation], to sign the customer application forms, complete KYC, and collect the SIM cards on behalf of the firm.

All bills may be raised in the name of **{{company}}** with GSTIN {{gstin}} and sent to {{email}}. We enclose the firm's PAN, GST certificate, certificate of incorporation, address proof and the authorised signatory's ID proof.

${SIGN_OFF}`,
  },
  {
    key: "authorisation",
    label: "Authorisation letter",
    description: "Authorise an employee or partner to act for the firm with any organisation.",
    title: "Authorisation letter",
    recipient: "To,\n[Organisation]\n[Address]",
    subject: "Authorisation to act on behalf of {{company}}",
    body: `Dear Sir / Madam,

This is to certify that **[Name]**, [designation] of {{company}}, is authorised to [purpose — e.g. submit documents, sign forms, collect deliverables] on behalf of the firm.

Kindly accept the signature of the authorised person below as genuine.

Specimen signature of [Name]: ______________________

${SIGN_OFF}`,
  },
  {
    key: "noc_address",
    label: "NOC · Use of address",
    description: "No-objection certificate for using a premises as a registered / business address.",
    title: "No objection certificate",
    recipient: "TO WHOM IT MAY CONCERN",
    subject: "No objection certificate for use of premises",
    body: `This is to certify that **{{company}}** has no objection to [Name / entity] using the premises at [address] as its [registered office / place of business] for the purpose of [GST / bank / licence] registration.

This certificate is issued on request for the purpose stated above.

${SIGN_OFF}`,
  },
  {
    key: "to_whom",
    label: "To whom it may concern",
    description: "General certificate or confirmation letter (employment, engagement, address).",
    title: "To whom it may concern",
    recipient: "TO WHOM IT MAY CONCERN",
    subject: "",
    body: `This is to certify that [details].

This letter is issued on request for [purpose] and carries no other liability on the part of the firm.

${SIGN_OFF}`,
  },
];

export const LETTER_TEMPLATE_KEYS = LETTER_TEMPLATES.map((template) => template.key);
