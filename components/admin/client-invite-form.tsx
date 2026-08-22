"use client";

import { useFormState } from "react-dom";
import { inviteClientUser, type ClientState } from "@/app/admin/(dashboard)/clients/actions";
import SubmitButton from "./submit-button";
import CopyButton from "./copy-button";

const initialState: ClientState = { ok: false, message: "" };

export default function ClientInviteForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useFormState(inviteClientUser, initialState);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="client-invite-email" className="block text-xs uppercase tracking-[0.18em] text-text-primary/60">
            Email
          </label>
          <input
            id="client-invite-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label htmlFor="client-invite-password" className="block text-xs uppercase tracking-[0.18em] text-text-primary/60">
            Password (optional)
          </label>
          <input
            id="client-invite-password"
            name="password"
            type="text"
            minLength={12}
            autoComplete="off"
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
        <SubmitButton pendingLabel="Sending...">Invite to portal</SubmitButton>
      </div>

      <p className="mt-2 text-xs text-text-primary/60">
        Leave the password blank to generate a one-time sign-in link the contact can use to choose
        their own. At least 12 characters otherwise.
      </p>

      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}

      {state.link && (
        <div className="mt-3 rounded-card border border-border bg-canvas-warm p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-text-primary/60">Portal link</p>
            <CopyButton value={state.link} label="Copy link" />
          </div>
          <p className="mt-1 break-all font-mono text-xs text-text-primary/80">{state.link}</p>
        </div>
      )}
    </form>
  );
}
