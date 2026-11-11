import { LEAD_INTERESTS, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/crm";
import SubmitButton from "./submit-button";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export type LeadRecord = {
  id: string;
  company: string;
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_url: string | null;
  industry: string | null;
  city: string | null;
  site: string;
  source: string;
  priority: string;
  interests: string[] | null;
  estimated_value: number | null;
  next_follow_up: string | null;
  owner_id: string | null;
  notes: string | null;
  research_notes: string | null;
};

export default function LeadForm({
  lead,
  owners,
  action,
  submitLabel,
  defaultOwnerId,
  compact = false,
}: {
  lead?: LeadRecord;
  owners: { id: string; label: string }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultOwnerId?: string;
  compact?: boolean;
}) {
  const key = lead?.id ?? "new";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="lg:col-span-2">
        <label htmlFor={`company-${key}`} className={LABEL}>
          Business <span className="text-error">*</span>
        </label>
        <input id={`company-${key}`} name="company" required defaultValue={lead?.company ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`contact-${key}`} className={LABEL}>
          Contact person
        </label>
        <input id={`contact-${key}`} name="contact_name" defaultValue={lead?.contact_name ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`phone-${key}`} className={LABEL}>
          Phone / WhatsApp
        </label>
        <input id={`phone-${key}`} name="phone" type="tel" defaultValue={lead?.phone ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`email-${key}`} className={LABEL}>
          Email
        </label>
        <input id={`email-${key}`} name="email" type="email" defaultValue={lead?.email ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`city-${key}`} className={LABEL}>
          City / area
        </label>
        <input id={`city-${key}`} name="city" defaultValue={lead?.city ?? ""} className={FIELD} />
      </div>
      <div>
        <label htmlFor={`industry-${key}`} className={LABEL}>
          Industry
        </label>
        <input id={`industry-${key}`} name="industry" defaultValue={lead?.industry ?? ""} placeholder="Restaurant, clinic, retail..." className={FIELD} />
      </div>
      <div>
        <label htmlFor={`site-${key}`} className={LABEL}>
          Brand
        </label>
        <select id={`site-${key}`} name="site" defaultValue={lead?.site ?? "studio"} className={FIELD}>
          <option value="studio">lynvo.studio — online presence</option>
          <option value="tech">lynvo.tech — software / security</option>
        </select>
      </div>
      <div>
        <label htmlFor={`source-${key}`} className={LABEL}>
          Source
        </label>
        <select id={`source-${key}`} name="source" defaultValue={lead?.source ?? "cold_call"} className={FIELD}>
          {LEAD_SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`priority-${key}`} className={LABEL}>
          Priority
        </label>
        <select id={`priority-${key}`} name="priority" defaultValue={lead?.priority ?? "medium"} className={FIELD}>
          {LEAD_PRIORITIES.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`follow-${key}`} className={LABEL}>
          Next follow-up
        </label>
        <input id={`follow-${key}`} name="next_follow_up" type="date" defaultValue={lead?.next_follow_up ?? ""} className={FIELD} />
      </div>
      {!compact && (
        <>
          <div>
            <label htmlFor={`designation-${key}`} className={LABEL}>
              Designation
            </label>
            <input id={`designation-${key}`} name="designation" defaultValue={lead?.designation ?? ""} className={FIELD} />
          </div>
          <div>
            <label htmlFor={`value-${key}`} className={LABEL}>
              Estimated value (₹)
            </label>
            <input id={`value-${key}`} name="estimated_value" type="number" min="0" step="100" defaultValue={lead?.estimated_value ?? ""} className={FIELD} />
          </div>
          <div>
            <label htmlFor={`website-${key}`} className={LABEL}>
              Website
            </label>
            <input id={`website-${key}`} name="website" defaultValue={lead?.website ?? ""} className={FIELD} />
          </div>
          <div>
            <label htmlFor={`social-${key}`} className={LABEL}>
              Instagram / social
            </label>
            <input id={`social-${key}`} name="social_url" defaultValue={lead?.social_url ?? ""} className={FIELD} />
          </div>
        </>
      )}
      <div>
        <label htmlFor={`owner-${key}`} className={LABEL}>
          Owner
        </label>
        <select id={`owner-${key}`} name="owner_id" defaultValue={lead?.owner_id ?? defaultOwnerId ?? ""} className={FIELD}>
          <option value="">Unassigned</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="sm:col-span-2 lg:col-span-4">
        <legend className={LABEL}>Interested in</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {LEAD_INTERESTS.map((interest) => (
            <label key={interest} className="flex items-center gap-1.5 text-sm text-ink-900">
              <input
                type="checkbox"
                name="interests"
                value={interest}
                defaultChecked={lead?.interests?.includes(interest)}
                className="h-4 w-4 accent-brand-700"
              />
              {interest}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={compact ? "sm:col-span-2 lg:col-span-4" : "sm:col-span-2"}>
        <label htmlFor={`notes-${key}`} className={LABEL}>
          Notes
        </label>
        <textarea id={`notes-${key}`} name="notes" rows={3} defaultValue={lead?.notes ?? ""} className={FIELD} />
      </div>
      {!compact && (
        <div className="sm:col-span-2">
          <label htmlFor={`research-${key}`} className={LABEL}>
            Research notes
          </label>
          <textarea
            id={`research-${key}`}
            name="research_notes"
            rows={3}
            defaultValue={lead?.research_notes ?? ""}
            placeholder="Website state, Google profile, social activity, one specific improvement to pitch..."
            className={FIELD}
          />
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
