"use client";

import { useFormState } from "react-dom";
import { saveSettings, type SettingsState } from "@/app/admin/(dashboard)/settings/actions";
import { SETTING_KEYS } from "@/lib/admin/settings";
import SubmitButton from "./submit-button";

const initialState: SettingsState = { ok: false, message: "" };

export default function SettingsForm({ values }: { values: Record<string, string> }) {
  const [state, formAction] = useFormState(saveSettings, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {SETTING_KEYS.map((setting) => (
        <div key={setting.key}>
          <label htmlFor={setting.key} className="block text-sm font-medium text-ink-900">
            {setting.label}
          </label>
          {setting.type === "textarea" ? (
            <textarea
              id={setting.key}
              name={setting.key}
              rows={3}
              defaultValue={values[setting.key] ?? ""}
              className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            />
          ) : (
            <input
              id={setting.key}
              name={setting.key}
              defaultValue={values[setting.key] ?? ""}
              className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            />
          )}
        </div>
      ))}

      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}

      <div className="border-t border-border pt-5">
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
