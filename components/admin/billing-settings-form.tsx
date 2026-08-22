"use client";

import { useFormState } from "react-dom";
import { saveBillingSettings, type BillingSettingsState } from "@/app/admin/(dashboard)/billing/actions";
import { BILLING_SETTING_GROUPS, type SettingGroup } from "@/lib/admin/billing";
import SubmitButton from "./submit-button";
import ImageSettingField from "./image-setting-field";

const initialState: BillingSettingsState = { ok: false, message: "" };

const inputClass =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

export default function BillingSettingsForm({
  values,
  groups = BILLING_SETTING_GROUPS,
  action = saveBillingSettings,
  submitLabel = "Save billing settings",
}: {
  values: Record<string, string>;
  groups?: SettingGroup[];
  action?: (prev: BillingSettingsState, formData: FormData) => Promise<BillingSettingsState>;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      {groups.map((group) => (
        <section key={group.title} className="rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">{group.title}</h2>
          <p className="mt-1 text-sm text-text-primary/70">{group.description}</p>

          <div className="mt-4 space-y-4">
            {group.keys.map((setting) => (
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
                    className={inputClass}
                  />
                ) : setting.type === "image" ? (
                  <div className="mt-1">
                    <ImageSettingField id={setting.key} name={setting.key} defaultValue={values[setting.key] ?? ""} />
                  </div>
                ) : (
                  <input
                    id={setting.key}
                    name={setting.key}
                    defaultValue={values[setting.key] ?? ""}
                    className={inputClass}
                  />
                )}
                {setting.help && <p className="mt-1 text-xs text-text-primary/60">{setting.help}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}

      <div className="border-t border-border pt-5">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
