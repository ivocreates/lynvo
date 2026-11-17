import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { requirePermission } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { letterAssets, sanitizePlacements, type Letter } from "@/lib/letters";
import LetterEditor from "@/components/letters/letter-editor";
import Flash, { errorText } from "@/components/admin/flash";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteLetter, duplicateLetter, saveLetter } from "../actions";

export default async function EditLetterPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; copied?: string; error?: string };
}) {
  await requirePermission("letters");

  const db = createClient();
  const [{ data }, settings] = await Promise.all([db.from("letters").select("*").eq("id", params.id).maybeSingle(), getBillingSettings()]);
  if (!data) notFound();

  const row = data as Record<string, unknown>;
  const letter: Letter = {
    id: String(row.id),
    title: String(row.title ?? ""),
    reference: (row.reference as string | null) ?? "",
    letter_date: String(row.letter_date ?? ""),
    recipient: (row.recipient as string | null) ?? "",
    subject: (row.subject as string | null) ?? "",
    body: String(row.body ?? ""),
    placements: sanitizePlacements(row.placements),
    show_letterhead: row.show_letterhead !== false && row.show_letterhead !== 0,
    status: row.status === "final" ? "final" : "draft",
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/letters" className="text-sm text-brand-700 underline">
            Letters
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold text-ink-900">{letter.title}</h1>
          <p className="text-xs text-text-primary/60">{letter.reference}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/print/letter/${letter.id}`}
            className="rounded-card border border-border px-3 py-2 text-sm font-medium text-ink-900 hover:bg-surface"
          >
            Open PDF view
          </Link>
          <form action={duplicateLetter}>
            <input type="hidden" name="id" value={letter.id} />
            <button type="submit" className="rounded-card border border-border px-3 py-2 text-sm font-medium text-ink-900 hover:bg-surface">
              Duplicate
            </button>
          </form>
          <form action={deleteLetter}>
            <input type="hidden" name="id" value={letter.id} />
            <ConfirmSubmit message="Delete this letter? This cannot be undone." label="Delete" />
          </form>
        </div>
      </div>

      <Flash
        success={searchParams.saved ? "Saved." : searchParams.copied ? "Copied. You're editing the new copy." : null}
        error={errorText(searchParams.error)}
      />

      <LetterEditor letter={letter} settings={settings} assets={letterAssets(settings)} action={saveLetter} />
    </div>
  );
}

export const dynamic = "force-dynamic";
