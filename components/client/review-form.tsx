"use client";

import { useFormState, useFormStatus } from "react-dom";

type ReviewState = { ok: boolean; message: string };

const initialState: ReviewState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Submit review"}
    </button>
  );
}

export default function ReviewForm({ action }: { action: (state: ReviewState, formData: FormData) => Promise<ReviewState> }) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="mt-4 rounded-card border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div>
          <label htmlFor="rating" className="block text-xs uppercase tracking-[0.18em] text-text-primary/60">
            Rating
          </label>
          <select
            id="rating"
            name="rating"
            defaultValue="5"
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} / 5
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="content" className="block text-xs uppercase tracking-[0.18em] text-text-primary/60">
            Your review
          </label>
          <textarea
            id="content"
            name="content"
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            placeholder="Tell us about your experience working with LYNVO."
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton />
        {state.message && (
          <p role="status" className={`text-sm ${state.ok ? "text-success" : "text-error"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}