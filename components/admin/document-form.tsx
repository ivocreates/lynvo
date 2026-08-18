import {
  DOC_AUDIENCES,
  DOC_AUDIENCE_LABELS,
  DOC_TYPES,
  DOC_TYPE_LABELS,
  PLACEHOLDERS,
  type StaffDocument,
} from "@/lib/documents";

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

const STARTER = `# 1. Appointment
LYNVO ("the Company") is pleased to engage {{name}} ("the Associate") in the role of {{title}}, effective {{effective_from}}.

# 2. Term
This engagement runs from {{effective_from}} to {{effective_to}} unless terminated earlier in accordance with clause 6.

# 3. Responsibilities
- Deliver the work assigned through the LYNVO team workspace
- Attend the weekly team sync
- Maintain the confidentiality of all client material

# 4. Confidentiality
The Associate shall not disclose any client or company information to third parties during or after the term of this engagement.`;

export default function DocumentForm({
  doc,
  people,
  action,
  submitLabel,
  referenceSuggestion,
}: {
  doc?: StaffDocument;
  people: { id: string; label: string }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  referenceSuggestion?: string;
}) {
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {doc && <input type="hidden" name="id" value={doc.id} />}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className={LABEL_CLASS}>
            Title
          </label>
          <input id="title" name="title" required defaultValue={doc?.title} className={FIELD_CLASS} />
        </div>

        <div>
          <label htmlFor="body" className={LABEL_CLASS}>
            Body
          </label>
          <textarea
            id="body"
            name="body"
            rows={26}
            defaultValue={doc?.body ?? STARTER}
            className={`${FIELD_CLASS} font-mono text-[13px] leading-6`}
          />
          <p className="mt-2 text-xs text-text-primary/60">
            <code># </code> heading · <code>## </code> subheading · <code>- </code> bullet · <code>1. </code>{" "}
            numbered · blank line for a new paragraph. Text is rendered as text, never as HTML.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-card bg-brand-700 px-5 py-2.5 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          {submitLabel}
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="section-stamp mb-3">DETAILS</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="doc_type" className={LABEL_CLASS}>
                Type
              </label>
              <select id="doc_type" name="doc_type" defaultValue={doc?.doc_type ?? "contract"} className={FIELD_CLASS}>
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOC_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="audience" className={LABEL_CLASS}>
                Audience
              </label>
              <select
                id="audience"
                name="audience"
                defaultValue={doc?.audience ?? "individual"}
                className={FIELD_CLASS}
              >
                {DOC_AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {DOC_AUDIENCE_LABELS[audience]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="recipient_id" className={LABEL_CLASS}>
                Recipient
              </label>
              <select
                id="recipient_id"
                name="recipient_id"
                defaultValue={doc?.recipient_id ?? ""}
                className={FIELD_CLASS}
              >
                <option value="">Nobody in particular</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reference" className={LABEL_CLASS}>
                Reference
              </label>
              <input
                id="reference"
                name="reference"
                defaultValue={doc?.reference ?? referenceSuggestion ?? ""}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="issue_date" className={LABEL_CLASS}>
                Issue date
              </label>
              <input
                id="issue_date"
                name="issue_date"
                type="date"
                defaultValue={doc?.issue_date ?? new Date().toISOString().slice(0, 10)}
                className={FIELD_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="effective_from" className={LABEL_CLASS}>
                  Effective from
                </label>
                <input
                  id="effective_from"
                  name="effective_from"
                  type="date"
                  defaultValue={doc?.effective_from ?? ""}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="effective_to" className={LABEL_CLASS}>
                  Effective to
                </label>
                <input
                  id="effective_to"
                  name="effective_to"
                  type="date"
                  defaultValue={doc?.effective_to ?? ""}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-canvas-warm p-5">
          <p className="section-stamp mb-3">PLACEHOLDERS</p>
          <p className="text-xs leading-6 text-text-primary/70">
            These are replaced with the recipient&apos;s details when the document is rendered.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PLACEHOLDERS.map((token) => (
              <li key={token} className="rounded-card bg-surface px-2 py-1 font-mono text-[11px] text-brand-700">
                {token}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </form>
  );
}
