"use client";

import { useFormState } from "react-dom";
import { inviteStaff, type AdminsState } from "@/app/admin/(dashboard)/admins/actions";
import { STAFF_ROLES, ROLE_LABELS, ROLE_RANK, EMPLOYMENT_TYPES, type Role } from "@/lib/roles";
import SubmitButton from "./submit-button";
import CopyButton from "./copy-button";

const initialState: AdminsState = { ok: false, message: "" };

export default function InviteForm({ actorRole }: { actorRole: Role }) {
  const [state, formAction] = useFormState(inviteStaff, initialState);

  const assignableRoles =
    actorRole === "super_admin"
      ? STAFF_ROLES
      : STAFF_ROLES.filter((role) => ROLE_RANK[role] < ROLE_RANK[actorRole]);

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
            {assignableRoles.map((role) => (
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

      <div className="mt-4 max-w-sm">
        <label htmlFor="invite-password" className="block text-sm font-medium text-ink-900">
          Set a password (optional)
        </label>
        <input
          id="invite-password"
          name="password"
          type="text"
          minLength={12}
          autoComplete="off"
          className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        <p className="mt-1 text-xs text-text-primary/60">
          At least 12 characters. Leave blank to generate a one-time sign-in link instead. Using an
          existing member&apos;s email resets their password.
        </p>
      </div>

      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.ok ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}

      {state.link && (
        <div className="mt-3 rounded-card border border-border bg-canvas-warm p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-text-primary/60">Invite link</p>
            <CopyButton value={state.link} label="Copy link" />
          </div>
          <p className="mt-1 break-all font-mono text-xs text-text-primary/80">{state.link}</p>
        </div>
      )}
    </form>
  );
}
