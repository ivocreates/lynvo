"use client";

import { useState } from "react";
import { CERTIFICATE_TYPES, CERTIFICATE_TYPE_LABELS } from "@/lib/certificates";

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export type CertificatePerson = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  department: string | null;
  joined_on: string | null;
  ends_on: string | null;
};

export default function CertificateForm({
  people,
  action,
}: {
  people: CertificatePerson[];
  action: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState("");
  const person = people.find((entry) => entry.id === selected);

  // Re-keying the fields lets a fresh selection repopulate the defaults.
  const key = selected || "blank";

  return (
    <form action={action} className="mb-8 rounded-card border border-border bg-surface p-5">
      <p className="section-stamp mb-3">NEW CERTIFICATE</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="recipient_id" className={LABEL_CLASS}>
            Team member
          </label>
          <select
            id="recipient_id"
            name="recipient_id"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not on the team</option>
            {people.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name || "Unnamed team member"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cert_type" className={LABEL_CLASS}>
            Type
          </label>
          <select id="cert_type" name="cert_type" defaultValue="internship" className={FIELD_CLASS}>
            {CERTIFICATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {CERTIFICATE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="recipient_name" className={LABEL_CLASS}>
            Name on certificate
          </label>
          <input
            key={`name-${key}`}
            id="recipient_name"
            name="recipient_name"
            required
            defaultValue={person?.name ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="recipient_email" className={LABEL_CLASS}>
            Email
          </label>
          <input
            key={`email-${key}`}
            id="recipient_email"
            name="recipient_email"
            type="email"
            defaultValue={person?.email ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="role_title" className={LABEL_CLASS}>
            Role
          </label>
          <input
            key={`role-${key}`}
            id="role_title"
            name="role_title"
            defaultValue={person?.title ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="department" className={LABEL_CLASS}>
            Department
          </label>
          <input
            key={`dept-${key}`}
            id="department"
            name="department"
            defaultValue={person?.department ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="start_date" className={LABEL_CLASS}>
            From
          </label>
          <input
            key={`start-${key}`}
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={person?.joined_on ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="end_date" className={LABEL_CLASS}>
            To
          </label>
          <input
            key={`end-${key}`}
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={person?.ends_on ?? ""}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="skills" className={LABEL_CLASS}>
            Skills
          </label>
          <input id="skills" name="skills" placeholder="React, Figma" className={FIELD_CLASS} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="summary" className={LABEL_CLASS}>
            Summary
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            placeholder="What they worked on and how they performed."
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
      >
        Create draft
      </button>
    </form>
  );
}
