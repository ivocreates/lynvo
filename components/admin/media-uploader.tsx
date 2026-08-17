"use client";

import { useFormState } from "react-dom";
import { uploadMedia, type MediaState } from "@/app/admin/(dashboard)/media/actions";
import SubmitButton from "./submit-button";

const initialState: MediaState = { ok: false, message: "" };

export default function MediaUploader() {
  const [state, formAction] = useFormState(uploadMedia, initialState);

  return (
    <form
      action={formAction}
      className="mb-8 rounded-card border border-border bg-surface p-5"
    >
      <p className="section-stamp mb-3">UPLOAD</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-ink-900">
            Image file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-700 file:px-3 file:py-1 file:text-text-inverse"
          />
          <p className="mt-1 text-xs text-text-primary/60">Max 5 MB.</p>
        </div>
        <div>
          <label htmlFor="alt_text" className="block text-sm font-medium text-ink-900">
            Alt text
          </label>
          <input
            id="alt_text"
            name="alt_text"
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
        <SubmitButton pendingLabel="Uploading...">Upload</SubmitButton>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mt-3 text-sm ${state.ok ? "text-success" : "text-error"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
