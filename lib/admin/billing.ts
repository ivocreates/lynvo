export type DocType = "quote" | "invoice";

export type Region = "IN" | "INT";

export type Recurring = "one_time" | "monthly" | "yearly";

/** Catalogue categories, in the order they should appear on a quotation. */
export const BILLING_CATEGORIES = [
  "Website",
  "Pages",
  "UI/UX",
  "Authentication",
  "User Management",
  "Admin Panel",
  "E-Commerce",
  "Payments",
  "Shipping",
  "Communication",
  "Google Integrations",
  "SEO",
  "GEO / Local SEO",
  "Performance",
  "Security",
  "Hosting",
  "Deployment",
  "API Integrations",
  "Advanced Features",
  "AI",
  "Branding",
  "Content",
  "Testing",
  "Training",
  "Maintenance",
  "Support",
  "Infrastructure",
  "Package",
  "Retainer",
  "Other",
] as const;

export const CATEGORY_OPTIONS = BILLING_CATEGORIES.map((value) => ({ value, label: value }));

export const REGIONS: { value: Region; label: string; currency: string }[] = [
  { value: "IN", label: "India (INR)", currency: "INR" },
  { value: "INT", label: "International (USD)", currency: "USD" },
];

export const RECURRING_OPTIONS: { value: Recurring; label: string; suffix: string }[] = [
  { value: "one_time", label: "One-time", suffix: "" },
  { value: "monthly", label: "Monthly", suffix: "/month" },
  { value: "yearly", label: "Yearly", suffix: "/year" },
];

export function recurringSuffix(value: string | null | undefined) {
  return RECURRING_OPTIONS.find((option) => option.value === value)?.suffix ?? "";
}

export function readRegion(value: unknown): Region {
  return value === "INT" ? "INT" : "IN";
}

export function currencyForRegion(region: Region) {
  return region === "INT" ? "USD" : "INR";
}

/** Orders categories by the catalogue sequence, unknown ones last. */
export function categoryRank(category: string | null | undefined) {
  const index = BILLING_CATEGORIES.indexOf((category ?? "") as (typeof BILLING_CATEGORIES)[number]);
  return index === -1 ? BILLING_CATEGORIES.length : index;
}

export const DOC_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export const BILLING_SETTING_GROUPS: {
  title: string;
  description: string;
  keys: { key: string; label: string; type: "text" | "textarea" | "image"; help?: string }[];
}[] = [
  {
    title: "Letterhead",
    description: "Shown in the header of every quote and invoice.",
    keys: [
      { key: "billing_brand_name", label: "Brand name", type: "text" },
      { key: "billing_legal_name", label: "Registered LLP name", type: "text" },
      { key: "billing_logo_url", label: "Logo URL", type: "text", help: "Public image URL. Leave blank to print the brand name instead." },
      { key: "billing_registered_address", label: "Registered address", type: "textarea" },
      { key: "billing_email", label: "Email", type: "text" },
      { key: "billing_phone", label: "Phone", type: "text" },
      { key: "billing_website", label: "Website", type: "text" },
      { key: "billing_tagline", label: "Tagline", type: "text", help: "Printed under the footer, e.g. Launch your next venture online." },
    ],
  },
  {
    title: "Statutory identifiers",
    description: "Printed alongside the letterhead for compliance.",
    keys: [
      { key: "billing_llpin", label: "LLPIN", type: "text" },
      { key: "billing_gstin", label: "GSTIN", type: "text" },
      { key: "billing_pan", label: "PAN", type: "text" },
    ],
  },
  {
    title: "Signature & stamp",
    description: "Printed on quotes, invoices, HR documents and certificates.",
    keys: [
      { key: "billing_signature_url", label: "Authorized signatory signature", type: "image", help: "Transparent PNG of the signing partner's signature." },
      { key: "billing_stamp_url", label: "Company stamp / seal", type: "image", help: "Transparent PNG of the LLP stamp." },
    ],
  },
  {
    title: "Document defaults",
    description: "Applied to new documents and used to build numbers.",
    keys: [
      { key: "billing_currency", label: "Currency code", type: "text", help: "ISO code, e.g. INR or USD." },
      { key: "billing_quote_prefix", label: "Quote number prefix", type: "text" },
      { key: "billing_invoice_prefix", label: "Invoice number prefix", type: "text" },
      { key: "billing_quote_header_note", label: "Quote header note", type: "text", help: "Short line printed under the QUOTATION heading." },
      { key: "billing_invoice_header_note", label: "Invoice header note", type: "text", help: "Short line printed under the INVOICE heading." },
      { key: "billing_quote_terms", label: "Default quote terms", type: "textarea" },
      { key: "billing_invoice_terms", label: "Default invoice terms", type: "textarea" },
      { key: "billing_bank_details", label: "Bank / payment details", type: "textarea" },
      { key: "billing_payment_terms", label: "Default payment schedule", type: "textarea", help: "Printed on quotations, e.g. 40% advance / 60% before deployment." },
      { key: "billing_support_policy", label: "Post-delivery support policy", type: "textarea" },
      { key: "billing_third_party_note", label: "Third-party cost note", type: "textarea" },
    ],
  },
  {
    title: "Footer",
    description: "Legal wording printed at the bottom of every page.",
    keys: [{ key: "billing_footer_legal", label: "Footer legal text", type: "textarea" }],
  },
  {
    title: "HR documents",
    description: "Used by contracts, offer letters, and certificates.",
    keys: [
      { key: "doc_reference_prefix", label: "Reference prefix", type: "text", help: "e.g. LYNVO/HR" },
      { key: "doc_signatory_name", label: "Signatory name", type: "text" },
      { key: "doc_signatory_title", label: "Signatory title", type: "text" },
      { key: "doc_header_note", label: "HR document header note", type: "text", help: "Short line printed under the document title." },
      { key: "doc_footer_note", label: "Document footer note", type: "textarea" },
      { key: "certificate_intro", label: "Certificate intro line", type: "text" },
      { key: "certificate_note", label: "Certificate verification note", type: "textarea" },
    ],
  },
];

export const BILLING_SETTING_KEYS = BILLING_SETTING_GROUPS.flatMap((group) =>
  group.keys.map((entry) => entry.key)
);

export type BillingSettings = Record<string, string>;

export interface LineItem {
  name: string;
  description: string | null;
  category: string | null;
  recurring: Recurring;
  unit: string | null;
  hsn_sac: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

/** Groups line items into the category blocks printed on a quotation. */
export function groupByCategory<T extends { category: string | null }>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = item.category?.trim() || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  return [...groups.entries()]
    .map(([category, entries]) => ({ category, items: entries }))
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTotals(items: LineItem[], discountAmount: number) {
  // Recurring services are quoted separately from the one-off project total.
  const oneOff = items.filter((item) => item.recurring === "one_time");
  const subtotal = round(oneOff.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
  const discount = round(Math.min(Math.max(discountAmount, 0), subtotal));
  // Discount is spread across lines proportionally so tax stays consistent.
  const discountRatio = subtotal > 0 ? discount / subtotal : 0;

  const taxAmount = round(
    oneOff.reduce((sum, item) => {
      const gross = item.quantity * item.unit_price;
      return sum + gross * (1 - discountRatio) * (item.tax_rate / 100);
    }, 0)
  );

  return { subtotal, discount, taxAmount, total: round(subtotal - discount + taxAmount) };
}

/** Totals per billing cycle for the "recurring services" block. */
export function recurringTotals(items: LineItem[]) {
  return RECURRING_OPTIONS.filter((option) => option.value !== "one_time")
    .map((option) => ({
      cycle: option.value,
      suffix: option.suffix,
      label: option.label,
      amount: round(
        items
          .filter((item) => item.recurring === option.value)
          .reduce((sum, item) => sum + item.quantity * item.unit_price * (1 + item.tax_rate / 100), 0)
      ),
    }))
    .filter((entry) => entry.amount > 0);
}

/** Reads `items[n][field]` rows out of the submitted form. */
export function parseLineItems(formData: FormData): LineItem[] {
  const items: LineItem[] = [];

  for (let index = 0; ; index += 1) {
    const name = formData.get(`items[${index}][name]`);
    if (name === null) break;

    const label = String(name).trim();
    if (!label) continue;

    const quantity = Number(formData.get(`items[${index}][quantity]`) ?? 0) || 0;
    const unitPrice = Number(formData.get(`items[${index}][unit_price]`) ?? 0) || 0;
    const taxRate = Number(formData.get(`items[${index}][tax_rate]`) ?? 0) || 0;

    const text = (field: string) => {
      const value = String(formData.get(`items[${index}][${field}]`) ?? "").trim();
      return value || null;
    };

    const recurring = String(formData.get(`items[${index}][recurring]`) ?? "one_time");

    items.push({
      name: label,
      description: text("description"),
      category: text("category"),
      recurring: (RECURRING_OPTIONS.some((option) => option.value === recurring)
        ? recurring
        : "one_time") as Recurring,
      unit: text("unit"),
      hsn_sac: text("hsn_sac"),
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_total: round(quantity * unitPrice),
    });
  }

  return items;
}

export function formatMoney(value: number, currency: string) {
  const code = currency || "INR";
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

/**
 * Builds the next document number as `PREFIX/FY/SEQ`, where the sequence is
 * derived from the highest existing number sharing the same prefix and year.
 */
export function nextDocumentNumber(prefix: string, existing: string[], date = new Date()) {
  const year = date.getFullYear();
  const base = `${prefix.replace(/\/+$/, "")}/${year}`;
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(\\d+)$`, "i");

  const highest = existing.reduce((max, value) => {
    const match = pattern.exec(value.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${base}/${String(highest + 1).padStart(4, "0")}`;
}
