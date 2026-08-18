"use client";

import { useFormState } from "react-dom";
import { inviteClientUser, type ClientState } from "@/app/admin/(dashboard)/clients/actions";
import SubmitButton from "./submit-button";

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
        <SubmitButton pendingLabel="Sending...">Invite to portal</SubmitButton>
      </div>

      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
