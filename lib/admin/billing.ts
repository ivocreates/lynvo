export type DocType = "quote" | "invoice";

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
  keys: { key: string; label: string; type: "text" | "textarea"; help?: string }[];
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
    title: "Document defaults",
    description: "Applied to new documents and used to build numbers.",
    keys: [
      { key: "billing_currency", label: "Currency code", type: "text", help: "ISO code, e.g. INR or USD." },
      { key: "billing_quote_prefix", label: "Quote number prefix", type: "text" },
      { key: "billing_invoice_prefix", label: "Invoice number prefix", type: "text" },
      { key: "billing_quote_terms", label: "Default quote terms", type: "textarea" },
      { key: "billing_invoice_terms", label: "Default invoice terms", type: "textarea" },
      { key: "billing_bank_details", label: "Bank / payment details", type: "textarea" },
    ],
  },
  {
    title: "Footer",
    description: "Legal wording printed at the bottom of every page.",
    keys: [{ key: "billing_footer_legal", label: "Footer legal text", type: "textarea" }],
  },
];

export const BILLING_SETTING_KEYS = BILLING_SETTING_GROUPS.flatMap((group) =>
  group.keys.map((entry) => entry.key)
);

export type BillingSettings = Record<string, string>;

export interface LineItem {
  name: string;
  description: string | null;
  unit: string | null;
  hsn_sac: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTotals(items: LineItem[], discountAmount: number) {
  const subtotal = round(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
  const discount = round(Math.min(Math.max(discountAmount, 0), subtotal));
  // Discount is spread across lines proportionally so tax stays consistent.
  const discountRatio = subtotal > 0 ? discount / subtotal : 0;

  const taxAmount = round(
    items.reduce((sum, item) => {
      const gross = item.quantity * item.unit_price;
      return sum + gross * (1 - discountRatio) * (item.tax_rate / 100);
    }, 0)
  );

  return { subtotal, discount, taxAmount, total: round(subtotal - discount + taxAmount) };
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

    items.push({
      name: label,
      description: text("description"),
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
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
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
