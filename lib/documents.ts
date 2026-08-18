export type DocType = "contract" | "offer_letter" | "nda" | "policy" | "letter";
export type DocStatus = "draft" | "issued" | "archived";
export type DocAudience = "individual" | "team" | "employees" | "interns";

export const DOC_TYPES: DocType[] = ["contract", "offer_letter", "nda", "policy", "letter"];
export const DOC_STATUSES: DocStatus[] = ["draft", "issued", "archived"];
export const DOC_AUDIENCES: DocAudience[] = ["individual", "team", "employees", "interns"];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  contract: "Employment contract",
  offer_letter: "Offer letter",
  nda: "NDA",
  policy: "Policy",
  letter: "Letter",
};

export const DOC_TYPE_HEADINGS: Record<DocType, string> = {
  contract: "EMPLOYMENT CONTRACT",
  offer_letter: "LETTER OF OFFER",
  nda: "NON-DISCLOSURE AGREEMENT",
  policy: "COMPANY POLICY",
  letter: "LETTER",
};

export const DOC_AUDIENCE_LABELS: Record<DocAudience, string> = {
  individual: "One person",
  team: "Whole team",
  employees: "Employees only",
  interns: "Interns only",
};

export type StaffDocument = {
  id: string;
  doc_type: DocType;
  status: DocStatus;
  audience: DocAudience;
  title: string;
  reference: string | null;
  body: string;
  recipient_id: string | null;
  issue_date: string;
  effective_from: string | null;
  effective_to: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

export type Recipient = {
  display_name: string | null;
  email: string;
  title: string | null;
  department: string | null;
  employment_type: string | null;
  joined_on: string | null;
  ends_on: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const PLACEHOLDERS = [
  "{{name}}",
  "{{email}}",
  "{{title}}",
  "{{department}}",
  "{{employment_type}}",
  "{{joined_on}}",
  "{{ends_on}}",
  "{{issue_date}}",
  "{{effective_from}}",
  "{{effective_to}}",
  "{{reference}}",
  "{{today}}",
];

/** Replaces {{token}} placeholders with recipient and document values. */
export function applyPlaceholders(
  body: string,
  doc: Pick<StaffDocument, "issue_date" | "effective_from" | "effective_to" | "reference">,
  recipient?: Recipient | null
) {
  const values: Record<string, string> = {
    name: recipient?.display_name ?? recipient?.email ?? "",
    email: recipient?.email ?? "",
    title: recipient?.title ?? "",
    department: recipient?.department ?? "",
    employment_type: recipient?.employment_type ?? "",
    joined_on: formatDate(recipient?.joined_on),
    ends_on: formatDate(recipient?.ends_on),
    issue_date: formatDate(doc.issue_date),
    effective_from: formatDate(doc.effective_from),
    effective_to: formatDate(doc.effective_to),
    reference: doc.reference ?? "",
    today: formatDate(new Date().toISOString().slice(0, 10)),
  };

  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match
  );
}

export type DocBlock =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "paragraph"; text: string };

/**
 * Parses the pasted body into blocks. Text is never treated as HTML, so an
 * author cannot inject markup into the rendered document.
 */
export function parseDocumentBody(body: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let list: string[] | null = null;
  let ordered: string[] | null = null;

  const flush = () => {
    if (list) blocks.push({ kind: "list", items: list });
    if (ordered) blocks.push({ kind: "ordered", items: ordered });
    list = null;
    ordered = null;
  };

  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "subheading", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(2).trim() });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (ordered) flush();
      list = list ?? [];
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      if (list) flush();
      ordered = ordered ?? [];
      ordered.push(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    flush();
    blocks.push({ kind: "paragraph", text: line });
  }

  flush();
  return blocks;
}

export function suggestReference(prefix: string, doc_type: DocType, sequence: number) {
  const codes: Record<DocType, string> = {
    contract: "CON",
    offer_letter: "OFR",
    nda: "NDA",
    policy: "POL",
    letter: "LTR",
  };
  return `${prefix || "LYNVO/HR"}/${codes[doc_type]}/${new Date().getFullYear()}/${String(sequence).padStart(3, "0")}`;
}
