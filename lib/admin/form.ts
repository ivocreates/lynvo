import type { FieldConfig, ResourceConfig } from "./resources";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

function parseField(field: FieldConfig, raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";

  switch (field.type) {
    case "boolean":
      return { value: raw === "on" || raw === "true" };

    case "number": {
      if (!value) return { value: null };
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return { error: "Must be a number." };
      if (field.min !== undefined && parsed < field.min) return { error: `Must be at least ${field.min}.` };
      if (field.max !== undefined && parsed > field.max) return { error: `Must be at most ${field.max}.` };
      return { value: parsed };
    }

    case "tags":
      return {
        value: value
          ? value.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      };

    case "json": {
      if (!value) return { value: {} };
      try {
        return { value: JSON.parse(value) };
      } catch {
        return { error: "Must be valid JSON." };
      }
    }

    case "slug": {
      if (!value) return { value: null };
      const slug = slugify(value);
      if (!slug) return { error: "Must contain at least one letter or number." };
      return { value: slug };
    }

    case "url": {
      if (!value) return { value: null };
      if (!/^https?:\/\/\S+$/i.test(value)) return { error: "Must start with http:// or https://" };
      return { value };
    }

    case "datetime":
      return { value: value ? new Date(value).toISOString() : null };

    case "select": {
      if (!value) return { value: null };
      const allowed = field.options?.some((option) => option.value === value);
      if (!allowed) return { error: "Not a valid option." };
      return { value };
    }

    default:
      return { value: value || null };
  }
}

export function parseResourceForm(resource: ResourceConfig, formData: FormData): ParseResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of resource.fields) {
    const result = parseField(field, formData.get(field.name));

    if ("error" in result && result.error) {
      errors[field.name] = result.error;
      continue;
    }

    const value = (result as { value: unknown }).value;

    if (field.required && (value === null || value === "" || value === undefined)) {
      errors[field.name] = "This field is required.";
      continue;
    }

    data[field.name] = value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

/** Formats a stored value for display inside a form control. */
export function toFieldValue(field: FieldConfig, value: unknown): string {
  if (value === null || value === undefined) return "";

  switch (field.type) {
    case "tags":
      return Array.isArray(value) ? value.join(", ") : "";
    case "json":
      return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    case "datetime": {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return "";
      // datetime-local expects YYYY-MM-DDTHH:mm in local time.
      const offset = date.getTimezoneOffset() * 60_000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }
    default:
      return String(value);
  }
}
