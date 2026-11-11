import type { LegalTemplate } from "@/lib/legal-templates";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

/** Inputs for a template's fields, pre-filled from client / staff / company data. */
export default function TemplateFields({ template, values }: { template: LegalTemplate; values: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {template.fields.map((field) => {
        const id = `field-${field.key}`;
        const name = `field:${field.key}`;
        const wide = field.type === "textarea";
        return (
          <div key={field.key} className={wide ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className={LABEL}>
              {field.label}
              {field.required && <span className="text-error"> *</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={id}
                name={name}
                rows={Math.min(10, Math.max(3, (values[field.key] ?? "").split("\n").length + 1))}
                defaultValue={values[field.key]}
                required={field.required}
                className={`${FIELD} font-mono text-[13px]`}
              />
            ) : field.type === "select" ? (
              <select id={id} name={name} defaultValue={values[field.key]} className={FIELD}>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={name}
                type={field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text"}
                step={field.type === "money" ? "0.01" : undefined}
                defaultValue={values[field.key]}
                required={field.required}
                className={FIELD}
              />
            )}
            {field.help && <p className="mt-1 text-xs text-text-primary/60">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
