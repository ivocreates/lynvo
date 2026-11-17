/** Client-safe helpers for employee website profiles (migration 0004). */

export const SOCIAL_FIELDS = [
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "dribbble", label: "Dribbble / Behance", placeholder: "https://dribbble.com/…" },
  { key: "website", label: "Portfolio / website", placeholder: "https://…" },
] as const;

/** Keeps only known platforms with https links. */
export function socialLinksFrom(formData: FormData) {
  const links: Record<string, string> = {};
  for (const field of SOCIAL_FIELDS) {
    const value = String(formData.get(`social_${field.key}`) ?? "").trim().slice(0, 300);
    if (/^https:\/\/[^\s"'<>]+$/i.test(value)) links[field.key] = value;
  }
  return links;
}

export function skillsFrom(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
}
