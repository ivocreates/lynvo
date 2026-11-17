import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { LETTER_TEMPLATES, letterAssets, type Letter } from "@/lib/letters";
import LetterEditor from "@/components/letters/letter-editor";
import { saveLetter } from "../actions";

export default async function NewLetterPage({ searchParams }: { searchParams: { template?: string } }) {
  await requirePermission("letters");
  const settings = await getBillingSettings();
  const template = LETTER_TEMPLATES.find((entry) => entry.key === searchParams.template) ?? LETTER_TEMPLATES[0];

  const letter: Letter = {
    id: "",
    title: template.title,
    reference: "",
    letter_date: new Date().toISOString().slice(0, 10),
    recipient: template.recipient,
    subject: template.subject,
    body: template.body,
    placements: [],
    show_letterhead: true,
    status: "draft",
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/letters" className="text-sm text-brand-700 underline">
            Letters
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">New letter</h1>
        </div>
        <div className="flex min-w-0 max-w-full items-center gap-2 text-sm">
          <span className="shrink-0 text-text-primary/70">Template</span>
          <span className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {LETTER_TEMPLATES.map((entry) => (
              <Link
                key={entry.key}
                href={`/admin/letters/new?template=${entry.key}`}
                className={`shrink-0 rounded-card border px-2 py-1 text-xs ${entry.key === template.key ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-surface"}`}
              >
                {entry.label}
              </Link>
            ))}
          </span>
        </div>
      </div>
      {/* key: switching template remounts the editor with the new text. */}
      <LetterEditor key={template.key} letter={letter} settings={settings} assets={letterAssets(settings)} action={saveLetter} />
    </div>
  );
}

export const dynamic = "force-dynamic";
