"use client";

import { useFormState } from "react-dom";
import { inviteStaff, type AdminsState } from "@/app/admin/(dashboard)/admins/actions";
import { ROLES, ROLE_LABELS, EMPLOYMENT_TYPES } from "@/lib/roles";
import SubmitButton from "./submit-button";

const initialState: AdminsState = { ok: false, message: "" };

export default function InviteForm() {
  const [state, formAction] = useFormState(inviteStaff, initialState);

  return (
    <form action={formAction} className="mb-8 rounded-card border border-border bg-surface p-5">
      <p className="section-stamp mb-3">INVITE A TEAM MEMBER</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-900">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-ink-900">
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="employee"
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invite-employment" className="block text-sm font-medium text-ink-900">
            Employment
          </label>
          <select
            id="invite-employment"
            name="employment_type"
            defaultValue=""
            className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
          >
            <option value="">Not set</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton pendingLabel="Sending...">Send invite</SubmitButton>
      </div>

      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
