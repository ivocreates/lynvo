"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { saveResource, type ResourceState } from "@/app/admin/(dashboard)/[resource]/actions";
import type { FieldConfig, ResourceConfig } from "@/lib/admin/resources";
import SubmitButton from "./submit-button";

const initialState: ResourceState = { ok: false, message: "" };

function Field({
  field,
  defaultValue,
  error,
}: {
  field: FieldConfig;
  defaultValue: string;
  error?: string;
}) {
  const base =
    "mt-1 w-full rounded-card border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-brand-700";
  const border = error ? "border-error" : "border-border";
  const describedBy = error ? `${field.name}-error` : field.help ? `${field.name}-help` : undefined;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={field.name}
          name={field.name}
          type="checkbox"
          defaultChecked={defaultValue === "true"}
          className="h-4 w-4 rounded border-border accent-brand-700"
        />
        <label htmlFor={field.name} className="text-sm font-medium text-ink-900">
          {field.label}
        </label>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={field.name} className="block text-sm font-medium text-ink-900">
        {field.label}
        {field.required && <span className="text-error"> *</span>}
      </label>

      {field.type === "select" ? (
        <select
          id={field.name}
          name={field.name}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          className={`${base} ${border}`}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" || field.type === "json" || field.type === "markdown" ? (
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={defaultValue}
          rows={field.type === "markdown" ? 14 : field.type === "json" ? 8 : 3}
          aria-describedby={describedBy}
          className={`${base} ${border} ${field.type === "json" ? "font-mono text-xs" : ""}`}
        />
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={
            field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"
          }
          min={field.min}
          max={field.max}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          className={`${base} ${border}`}
        />
      )}

      {field.help && !error && (
        <p id={`${field.name}-help`} className="mt-1 text-xs text-text-primary/60">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${field.name}-error`} className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ResourceForm({
  resource,
  values,
  id,
}: {
  resource: ResourceConfig;
  values: Record<string, string>;
  id?: string;
}) {
  const [state, formAction] = useFormState(saveResource, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <input type="hidden" name="__resource" value={resource.key} />
      {id && <input type="hidden" name="__id" value={id} />}

      {resource.fields.map((field) => (
        <Field
          key={field.name}
          field={field}
          defaultValue={values[field.name] ?? ""}
          error={state.errors?.[field.name]}
        />
      ))}

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-error">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <SubmitButton>{id ? "Save changes" : `Create ${resource.labelSingular.toLowerCase()}`}</SubmitButton>
        <Link href={`/admin/${resource.key}`} className="text-sm text-text-primary/70 underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
