/**
 * Bookkeeping helpers for an Indian LLP: financial years, categories, tax
 * estimates and the statutory compliance calendar.
 *
 * Figures are estimates to help plan; filings should be prepared or reviewed
 * by the LLP's chartered accountant.
 */

export const EXPENSE_CATEGORIES = [
  "Salaries & stipends",
  "Contractors & freelancers",
  "Software & subscriptions",
  "Hosting, domains & cloud",
  "Marketing & ads",
  "Rent & coworking",
  "Internet & phone",
  "Equipment & hardware",
  "Travel & conveyance",
  "Professional fees (CA, legal)",
  "Government fees & filings",
  "Bank & payment gateway charges",
  "Training & learning",
  "Office supplies",
  "Partner remuneration",
  "Other expense",
] as const;

export const INCOME_CATEGORIES = [
  "Project income",
  "Maintenance & retainers",
  "Consulting",
  "Licence / product income",
  "Interest",
  "Other income",
] as const;

/** Billing payments appear in reports under this category. */
export const INVOICE_INCOME_CATEGORY = "Invoice payments";

export const GST_RATES = [0, 5, 12, 18, 28];

/** Indian financial year that contains a date: FY 2026 = 1 Apr 2026 – 31 Mar 2027. */
export function fyOf(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  return month >= 4 ? year : year - 1;
}

export function fyRange(fy: number) {
  return { start: `${fy}-04-01`, end: `${fy + 1}-03-31` };
}

export function fyLabel(fy: number) {
  return `FY ${fy}-${String((fy + 1) % 100).padStart(2, "0")}`;
}

/** Assessment year in which the FY is taxed (the "AY" on returns). */
export function ayLabel(fy: number) {
  return `AY ${fy + 1}-${String((fy + 2) % 100).padStart(2, "0")}`;
}

/** Months of a financial year in order, as YYYY-MM. */
export function fyMonths(fy: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((index + 3) % 12) + 1;
    const year = index < 9 ? fy : fy + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

export function monthLabel(yyyyMm: string) {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function quarterOf(isoDate: string) {
  const month = Number(isoDate.slice(5, 7));
  if (month >= 4 && month <= 6) return "Q1";
  if (month >= 7 && month <= 9) return "Q2";
  if (month >= 10 && month <= 12) return "Q3";
  return "Q4";
}

/**
 * LLP income tax: 30% flat, +12% surcharge above ₹1 crore of income, +4% health
 * & education cess. Losses produce zero tax.
 */
export function estimateLlpTax(profit: number) {
  if (profit <= 0) return { base: 0, surcharge: 0, cess: 0, total: 0, effectiveRate: 0 };
  const base = profit * 0.3;
  const surcharge = profit > 1_00_00_000 ? base * 0.12 : 0;
  const cess = (base + surcharge) * 0.04;
  const total = Math.round(base + surcharge + cess);
  return { base: Math.round(base), surcharge: Math.round(surcharge), cess: Math.round(cess), total, effectiveRate: total / profit };
}

/** Advance tax instalments (cumulative share of the year's tax due by each date). */
export function advanceTaxSchedule(fy: number, annualTax: number) {
  return [
    { due: `${fy}-06-15`, share: 0.15 },
    { due: `${fy}-09-15`, share: 0.45 },
    { due: `${fy}-12-15`, share: 0.75 },
    { due: `${fy + 1}-03-15`, share: 1 },
  ].map((entry) => ({ ...entry, cumulative: Math.round(annualTax * entry.share) }));
}

export type ComplianceItem = {
  due: string;
  title: string;
  detail: string;
  authority: "MCA" | "Income Tax" | "GST" | "TDS";
  /** Only relevant if the LLP is GST-registered / deducts TDS / is audited. */
  condition?: "gst" | "tds" | "audit" | "no_audit";
};

/**
 * Statutory calendar for the FY. Due dates are the standard statutory dates;
 * the government sometimes extends them, so check with your CA.
 */
export function complianceCalendar(fy: number): ComplianceItem[] {
  const next = fy + 1;
  const items: ComplianceItem[] = [
    { due: `${fy}-05-30`, title: `LLP Form 11 — annual return (${fyLabel(fy - 1)})`, detail: "Partners, contributions and changes, filed with the MCA.", authority: "MCA" },
    { due: `${fy}-07-31`, title: `ITR-5 — income tax return (${fyLabel(fy - 1)})`, detail: "For LLPs that do not need a tax audit.", authority: "Income Tax", condition: "no_audit" },
    { due: `${fy}-09-30`, title: `Tax audit report, Form 3CA/3CD (${fyLabel(fy - 1)})`, detail: "Needed if turnover exceeds the audit threshold (₹1 crore, or ₹10 crore when cash transactions are under 5%) or in some presumptive-tax cases.", authority: "Income Tax", condition: "audit" },
    { due: `${fy}-09-30`, title: "DIR-3 KYC for each designated partner", detail: "Annual KYC of every designated partner's DPIN with the MCA.", authority: "MCA" },
    { due: `${fy}-10-30`, title: `LLP Form 8 — statement of accounts & solvency (${fyLabel(fy - 1)})`, detail: "Balance sheet and income statement signed by designated partners.", authority: "MCA" },
    { due: `${fy}-10-31`, title: `ITR-5 — income tax return, audited LLPs (${fyLabel(fy - 1)})`, detail: "For LLPs that require a tax audit.", authority: "Income Tax", condition: "audit" },
    { due: `${fy}-06-15`, title: "Advance tax — 1st instalment (15%)", detail: "Payable if the year's tax liability is ₹10,000 or more.", authority: "Income Tax" },
    { due: `${fy}-09-15`, title: "Advance tax — 2nd instalment (45%)", detail: "Cumulative 45% of the estimated tax.", authority: "Income Tax" },
    { due: `${fy}-12-15`, title: "Advance tax — 3rd instalment (75%)", detail: "Cumulative 75% of the estimated tax.", authority: "Income Tax" },
    { due: `${next}-03-15`, title: "Advance tax — final instalment (100%)", detail: "Balance of the estimated tax for the year.", authority: "Income Tax" },
    { due: `${fy}-07-31`, title: "TDS return Q1 (Form 24Q / 26Q)", detail: "For TDS deducted on salaries, contractors and professional fees in Apr–Jun.", authority: "TDS", condition: "tds" },
    { due: `${fy}-10-31`, title: "TDS return Q2", detail: "Jul–Sep deductions.", authority: "TDS", condition: "tds" },
    { due: `${next}-01-31`, title: "TDS return Q3", detail: "Oct–Dec deductions.", authority: "TDS", condition: "tds" },
    { due: `${next}-05-31`, title: "TDS return Q4", detail: "Jan–Mar deductions.", authority: "TDS", condition: "tds" },
    { due: `${next}-12-31`, title: `GSTR-9 — GST annual return (${fyLabel(fy)})`, detail: "Required above the annual turnover threshold notified for the year.", authority: "GST", condition: "gst" },
  ];

  // Monthly GST: GSTR-1 by the 11th and GSTR-3B (with payment) by the 20th of the following month.
  for (const month of fyMonths(fy)) {
    const [year, m] = month.split("-").map(Number);
    const following = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
    items.push({ due: `${following}-11`, title: `GSTR-1 for ${monthLabel(month)}`, detail: "Outward supplies (your invoices).", authority: "GST", condition: "gst" });
    items.push({ due: `${following}-20`, title: `GSTR-3B for ${monthLabel(month)} + GST payment`, detail: "Summary return; pay output GST minus input credit.", authority: "GST", condition: "gst" });
    // TDS deposit by the 7th of the next month (30 April for March).
    items.push({ due: m === 3 ? `${year}-04-30` : `${following}-07`, title: `Deposit TDS deducted in ${monthLabel(month)}`, detail: "Challan 281.", authority: "TDS", condition: "tds" });
  }

  return items.sort((a, b) => a.due.localeCompare(b.due));
}

export function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
