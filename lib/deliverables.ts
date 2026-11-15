/** Client-safe release rules for deliverable files and links. */

export type ReleaseRule = "immediate" | "after_invoice" | "after_all_paid" | "manual";

export const RELEASE_RULES: { value: ReleaseRule; label: string; help: string }[] = [
  { value: "after_all_paid", label: "After all invoices are paid", help: "Unlocks when the client has no outstanding balance." },
  { value: "after_invoice", label: "After a specific invoice is paid", help: "Pick the invoice below, e.g. the balance invoice." },
  { value: "manual", label: "When I release it", help: "Stays locked until you press Release." },
  { value: "immediate", label: "Immediately", help: "Previews, drafts and free resources." },
];

export const RELEASE_LABELS = Object.fromEntries(RELEASE_RULES.map((rule) => [rule.value, rule.label])) as Record<ReleaseRule, string>;

/** Largest file accepted for a deliverable (Workers request body limit). */
export const MAX_DELIVERABLE_BYTES = 100 * 1024 * 1024;

export type ReleaseState =
  | { released: true; reason: string }
  | { released: false; reason: string; invoiceId?: string | null; balance?: number; currency?: string };

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Only these characters survive in stored file names (used in R2 keys and downloads). */
export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").replace(/^[.-]+/, "");
  return (cleaned || "file").slice(-120);
}
