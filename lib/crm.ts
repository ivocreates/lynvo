/** Client-safe CRM constants. Mirrors the checks in migration 0030. */

export const LEAD_STATUSES = [
  { value: "new", label: "New", tone: "border-border bg-canvas-warm text-text-primary/70" },
  { value: "researching", label: "Researching", tone: "border-sand-400/60 bg-sand-400/20 text-clay-500" },
  { value: "contacted", label: "Contacted", tone: "border-brand-500/40 bg-brand-500/10 text-brand-700" },
  { value: "follow_up", label: "Follow-up", tone: "border-warning/40 bg-warning/10 text-warning" },
  { value: "meeting", label: "Meeting", tone: "border-brand-700/40 bg-brand-700/10 text-brand-700" },
  { value: "proposal", label: "Proposal sent", tone: "border-brand-700/40 bg-brand-700/15 text-brand-700" },
  { value: "won", label: "Won", tone: "border-success/40 bg-success/10 text-success" },
  { value: "lost", label: "Lost", tone: "border-error/30 bg-error/5 text-error" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export const OPEN_STATUSES: LeadStatus[] = ["new", "researching", "contacted", "follow_up", "meeting", "proposal"];

export const LEAD_STATUS_LABELS = Object.fromEntries(LEAD_STATUSES.map((entry) => [entry.value, entry.label])) as Record<string, string>;
export const LEAD_STATUS_TONES = Object.fromEntries(LEAD_STATUSES.map((entry) => [entry.value, entry.tone])) as Record<string, string>;

export const LEAD_SOURCES = [
  { value: "cold_call", label: "Cold call" },
  { value: "google_maps", label: "Google Maps research" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Cold email" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website enquiry" },
  { value: "walk_in", label: "Walk-in / visit" },
  { value: "event", label: "Event / networking" },
  { value: "other", label: "Other" },
];

export const LEAD_SOURCE_LABELS = Object.fromEntries(LEAD_SOURCES.map((entry) => [entry.value, entry.label])) as Record<string, string>;

export const LEAD_PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const LEAD_INTERESTS = [
  "Website",
  "E-commerce",
  "Logo & branding",
  "Social media",
  "SEO / Google",
  "Custom software",
  "Mobile app",
  "Cybersecurity",
  "Maintenance",
  "AI automation",
];

export const ACTIVITY_KINDS = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "visit", label: "Visit" },
  { value: "research", label: "Research" },
  { value: "note", label: "Note" },
];

export const ACTIVITY_LABELS = Object.fromEntries(ACTIVITY_KINDS.map((entry) => [entry.value, entry.label])) as Record<string, string>;

export const ACTIVITY_OUTCOMES = [
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Busy / call later" },
  { value: "callback", label: "Asked for a callback" },
  { value: "interested", label: "Interested" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "proposal_requested", label: "Wants a quote" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "sent", label: "Sent (email / WhatsApp)" },
  { value: "replied", label: "Replied" },
  { value: "other", label: "Other" },
];

export const OUTCOME_LABELS = Object.fromEntries(ACTIVITY_OUTCOMES.map((entry) => [entry.value, entry.label])) as Record<string, string>;

/** One-tap call outcomes on the lead page, with a sensible follow-up gap in days. */
export const QUICK_CALL_OUTCOMES: { outcome: string; label: string; followUpDays: number | null }[] = [
  { outcome: "no_answer", label: "No answer", followUpDays: 1 },
  { outcome: "busy", label: "Busy", followUpDays: 1 },
  { outcome: "callback", label: "Call back", followUpDays: 2 },
  { outcome: "interested", label: "Interested", followUpDays: 2 },
  { outcome: "meeting_booked", label: "Meeting booked", followUpDays: null },
  { outcome: "proposal_requested", label: "Wants a quote", followUpDays: 1 },
  { outcome: "not_interested", label: "Not interested", followUpDays: null },
];

/** Digits only, for tel: and wa.me links. Indian 10-digit numbers get the 91 prefix. */
export function phoneDigits(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function whatsappLink(phone: string | null | undefined, message?: string) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** Splits pasted CSV / spreadsheet rows; handles quoted cells and tabs. */
export function parseLeadCsv(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = "";
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  };

  const header = split(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ""));
  const pick = (row: string[], ...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index !== -1 && row[index]) return row[index];
    }
    return "";
  };

  return lines.slice(1).map((line) => {
    const row = split(line);
    return {
      company: pick(row, "company", "business", "name", "businessname"),
      contact_name: pick(row, "contact", "contactname", "person", "owner"),
      phone: pick(row, "phone", "mobile", "number", "phonenumber", "contactnumber"),
      email: pick(row, "email", "mail"),
      website: pick(row, "website", "url", "site"),
      city: pick(row, "city", "location", "area"),
      industry: pick(row, "industry", "category", "type"),
      notes: pick(row, "notes", "note", "comments"),
    };
  });
}
