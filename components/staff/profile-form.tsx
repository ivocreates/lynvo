"use client";

import { useFormState } from "react-dom";
import { updateOwnProfile, type ProfileState } from "@/app/staff/profile/actions";
import SubmitButton from "@/components/admin/submit-button";
import { SOCIAL_FIELDS } from "@/lib/team-profile";

const initialState: ProfileState = { ok: false, message: "" };

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-base focus:border-brand-700 focus:outline-none sm:text-sm";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default function StaffProfileForm({
  defaults,
}: {
  defaults: { display_name: string; phone: string; bio: string; skills: string; social: Record<string, string> };
}) {
  const [state, formAction] = useFormState(updateOwnProfile, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-5 rounded-card border border-border bg-surface p-4 sm:p-6">
      <div>
        <label htmlFor="display_name" className={LABEL_CLASS}>
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          required
          defaultValue={defaults.display_name}
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label htmlFor="phone" className={LABEL_CLASS}>
          Phone
        </label>
        <input id="phone" name="phone" defaultValue={defaults.phone} className={FIELD_CLASS} />
      </div>
      <div>
        <label htmlFor="skills" className={LABEL_CLASS}>
          Skills
        </label>
        <input
          id="skills"
          name="skills"
          defaultValue={defaults.skills}
          placeholder="React, Figma, OWASP"
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-xs text-text-primary/60">Comma separated.</p>
      </div>
      <div>
        <label htmlFor="bio" className={LABEL_CLASS}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={2000}
          defaultValue={defaults.bio}
          placeholder="Two or three sentences about what you do and what you enjoy working on."
          className={FIELD_CLASS}
        />
        <p className="mt-1 text-xs text-text-primary/60">Shown on the public team page if you are listed there.</p>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className={`${LABEL_CLASS} mb-1`}>Links (https only)</legend>
        {SOCIAL_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`social_${field.key}`} className="block text-xs text-text-primary/70">
              {field.label}
            </label>
            <input
              id={`social_${field.key}`}
              name={`social_${field.key}`}
              type="url"
              defaultValue={defaults.social[field.key] ?? ""}
              placeholder={field.placeholder}
              className={FIELD_CLASS}
            />
          </div>
        ))}
      </fieldset>

      <SubmitButton pendingLabel="Saving...">Save profile</SubmitButton>

      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
