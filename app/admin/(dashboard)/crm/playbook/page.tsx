import { requirePermission } from "@/lib/auth";
import { MESSAGE_TEMPLATES, OBJECTIONS, PITCHES, RESEARCH_CHECKLIST, fillTemplate } from "@/lib/crm-playbook";
import PageHeader from "@/components/admin/page-header";
import CrmNav from "@/components/admin/crm-nav";
import CopyButton from "@/components/admin/copy-button";

export default async function PlaybookPage() {
  const profile = await requirePermission("crm");
  const me = profile.display_name?.split(" ")[0] ?? "the LYNVO team";

  return (
    <div>
      <PageHeader
        stamp="SALES & MARKETING"
        title="Playbook & scripts"
        description="What to say, how to handle pushback, and ready-to-send messages for both brands."
      />
      <CrmNav active="playbook" />

      <div className="grid gap-6 xl:grid-cols-2">
        {PITCHES.map((pitch) => (
          <section key={pitch.key} className="rounded-card border border-border bg-surface p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-ink-900">{pitch.title}</h2>
            <p className="mt-1 text-xs text-text-primary/60">Best for: {pitch.audience}</p>

            <h3 className="section-stamp mt-5">1. OPENER</h3>
            <p className="mt-1 text-text-primary/85">{fillTemplate(pitch.opener, { me, contact: "[name]", company: "[business]" })}</p>

            <h3 className="section-stamp mt-5">2. ASK, THEN LISTEN</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-text-primary/85">
              {pitch.discovery.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>

            <h3 className="section-stamp mt-5">3. WHAT WE OFFER</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-text-primary/85">
              {pitch.value.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <h3 className="section-stamp mt-5">4. CLOSE FOR THE NEXT STEP</h3>
            <p className="mt-1 text-text-primary/85">{pitch.close}</p>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-card border border-border bg-surface p-5 text-sm">
        <h2 className="font-display text-lg font-semibold text-ink-900">Handling objections</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {OBJECTIONS.map((entry) => (
            <div key={entry.objection} className="rounded-card border border-border p-4">
              <dt className="font-medium text-ink-900">&ldquo;{entry.objection}&rdquo;</dt>
              <dd className="mt-1 text-text-primary/80">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
        <section className="rounded-card border border-border bg-surface p-5 text-sm">
          <h2 className="font-display text-lg font-semibold text-ink-900">Research checklist (5 minutes per lead)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-text-primary/85">
            {RESEARCH_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-text-primary/60">
            Tip: build a list from Google Maps (e.g. &ldquo;cafés in Panaji&rdquo;) in a spreadsheet, then paste it into Leads → Import.
          </p>
        </section>

        <section className="rounded-card border border-border bg-surface p-5 text-sm">
          <h2 className="font-display text-lg font-semibold text-ink-900">Message templates</h2>
          <p className="mt-1 text-xs text-text-primary/60">Open a lead to get these pre-filled with the business and contact name.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {MESSAGE_TEMPLATES.map((template) => {
              const body = fillTemplate(template.body, { me });
              return (
                <li key={template.key} className="rounded-card border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink-900">
                      {template.title} <span className="text-xs text-text-primary/50">· {template.channel}</span>
                    </span>
                    <CopyButton value={body} label="Copy" />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-xs text-text-primary/75">{body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
