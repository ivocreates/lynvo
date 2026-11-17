import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/db/server";
import { requirePermission } from "@/lib/auth";
import { LETTER_TEMPLATES, formatLetterDate } from "@/lib/letters";
import PageHeader from "@/components/admin/page-header";
import Flash, { errorText } from "@/components/admin/flash";

type Row = {
  id: string;
  title: string;
  reference: string | null;
  letter_date: string;
  subject: string | null;
  status: string;
  updated_at: string;
};

export default async function LettersPage({ searchParams }: { searchParams: { q?: string; deleted?: string; error?: string } }) {
  await requirePermission("letters");

  const db = createClient();
  let query = db.from("letters").select("id, title, reference, letter_date, subject, status, updated_at").order("updated_at", { ascending: false }).limit(200);
  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,()]/g, "");
    query = query.or(`title.ilike.%${term}%,subject.ilike.%${term}%,reference.ilike.%${term}%,recipient.ilike.%${term}%`);
  }
  const { data, error } = await query;
  const letters = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader
        stamp="OFFICE"
        title="Letters"
        description="Letters on the LYNVO letterhead for banks, telecom, government offices and partners, with signature and stamp."
        action={{ href: "/admin/letters/new", label: "New letter" }}
      />
      <Flash success={searchParams.deleted ? "Letter deleted." : null} error={errorText(searchParams.error)} />

      {error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Letters are not set up yet. Apply migrations/0003_letters.sql (npm run db:migrate:remote).
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-ink-900">Start from a template</h2>
        <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
          {LETTER_TEMPLATES.map((template) => (
            <Link
              key={template.key}
              href={`/admin/letters/new?template=${template.key}`}
              className="w-60 shrink-0 snap-start rounded-card border border-border bg-surface p-4 hover:border-brand-700 sm:w-auto"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                {template.key === "blank" ? <Plus aria-hidden className="h-4 w-4 text-brand-700" /> : <FileText aria-hidden className="h-4 w-4 text-brand-700" />}
                {template.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-text-primary/65">{template.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-ink-900">Your letters</h2>
          <form method="get" className="w-full sm:w-72">
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search letters…"
              aria-label="Search letters"
              className="w-full rounded-card border border-border bg-surface px-3 py-2 text-base focus:border-brand-700 focus:outline-none sm:text-sm"
            />
          </form>
        </div>

        {letters.length === 0 ? (
          <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
            {searchParams.q ? "No letters match." : "No letters yet. Pick a template above to write your first one."}
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {letters.map((letter) => (
              <li key={letter.id} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas-warm/50">
                <Link href={`/admin/letters/${letter.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink-900">{letter.title}</span>
                    <span
                      className={`shrink-0 rounded-card border px-1.5 py-0.5 text-[11px] ${
                        letter.status === "final" ? "border-success/40 bg-success/10 text-success" : "border-border text-text-primary/60"
                      }`}
                    >
                      {letter.status === "final" ? "Final" : "Draft"}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-primary/60">
                    {[letter.reference, formatLetterDate(letter.letter_date), letter.subject].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <Link
                  href={`/admin/print/letter/${letter.id}`}
                  className="shrink-0 rounded-card border border-border px-3 py-1.5 text-xs font-medium text-ink-900 hover:bg-canvas-warm"
                >
                  PDF
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
