import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { getTemplate, staffTemplates } from "@/lib/legal-templates";
import { companyValues, initialFieldValues, staffValues } from "@/lib/legal-autofill";
import PageHeader from "@/components/admin/page-header";
import Flash from "@/components/admin/flash";
import TemplateFields from "@/components/admin/template-fields";
import SubmitButton from "@/components/admin/submit-button";
import { createFromTemplate } from "../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function HrTemplatesPage({
  searchParams,
}: {
  searchParams: { template?: string; person?: string; error?: string };
}) {
  await requireManager();

  const supabase = createClient();
  const { data: peopleRows } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, title")
    .neq("role", "client")
    .order("display_name");
  const people = (peopleRows ?? []) as { id: string; display_name: string | null; email: string; role: Role; title: string | null }[];

  const template = searchParams.template ? getTemplate(searchParams.template) : undefined;
  const personId = searchParams.person ?? "";
  const ready = template && template.audience === "staff" && personId;

  const [company, staff] = ready ? await Promise.all([companyValues(), staffValues(personId)]) : [null, null];
  const values = ready && staff ? initialFieldValues(template!, { ...company, ...staff.party, ...staff.defaults }) : {};

  const groups = new Map<string, ReturnType<typeof staffTemplates>>();
  for (const entry of staffTemplates()) groups.set(entry.category, [...(groups.get(entry.category) ?? []), entry]);

  return (
    <div>
      <PageHeader
        stamp="HR"
        title={template ? template.title : "HR templates"}
        description={template?.description ?? "Offer letters, agreements, payslips and certificates, auto-filled from the team member's profile."}
      />
      <Link href="/admin/documents" className="mb-6 inline-block text-sm text-brand-700 underline">
        Back to HR documents
      </Link>
      <Flash error={searchParams.error} />

      <form method="get" className="mb-8 grid gap-4 rounded-card border border-border bg-surface p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="template" className={LABEL}>
            Template
          </label>
          <select id="template" name="template" defaultValue={template?.key ?? ""} required className={FIELD}>
            <option value="" disabled>
              Choose...
            </option>
            {[...groups.entries()].map(([category, entries]) => (
              <optgroup key={category} label={category}>
                {entries.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="person" className={LABEL}>
            Team member
          </label>
          <select id="person" name="person" defaultValue={personId} required className={FIELD}>
            <option value="" disabled>
              Choose...
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name ?? person.email} — {person.title ?? ROLE_LABELS[person.role]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-primary/60">
            Hiring someone new? Invite them on the People page first so their profile can fill the letter.
          </p>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm">
            {ready ? "Refresh auto-fill" : "Continue"}
          </button>
        </div>
      </form>

      {!template && (
        <div className="grid gap-6 lg:grid-cols-3">
          {[...groups.entries()].map(([category, entries]) => (
            <div key={category}>
              <p className="section-stamp mb-2">{category.toUpperCase()}</p>
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.key} className="rounded-card border border-border bg-surface p-4">
                    <p className="font-medium text-ink-900">{entry.title}</p>
                    <p className="mt-1 text-xs text-text-primary/60">{entry.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {ready && staff && (
        <form action={createFromTemplate} className="space-y-6 rounded-card border border-border bg-surface p-5">
          <input type="hidden" name="template" value={template!.key} />
          <input type="hidden" name="person_id" value={personId} />
          <p className="text-sm text-text-primary/70">
            Pre-filled for {staff.party.name}. The draft opens in the HR document editor so you can adjust the wording before
            issuing it{template!.signature ? "; they will be asked to sign it" : ""}.
          </p>
          <TemplateFields template={template!} values={values} />
          <div className="border-t border-border pt-5">
            <SubmitButton pendingLabel="Generating...">Generate draft</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
