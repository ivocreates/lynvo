"use client";

import { useFormState } from "react-dom";
import { updateOwnProfile, type ProfileState } from "@/app/staff/profile/actions";
import SubmitButton from "@/components/admin/submit-button";

const initialState: ProfileState = { ok: false, message: "" };

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default function StaffProfileForm({
  defaults,
}: {
  defaults: { display_name: string; phone: string; bio: string; skills: string };
}) {
  const [state, formAction] = useFormState(updateOwnProfile, initialState);

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-5 rounded-card border border-border bg-surface p-6">
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
        <textarea id="bio" name="bio" rows={5} defaultValue={defaults.bio} className={FIELD_CLASS} />
      </div>

      <SubmitButton pendingLabel="Saving...">Save profile</SubmitButton>

      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
