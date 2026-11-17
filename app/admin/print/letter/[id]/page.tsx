import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/db/server";
import { requirePermission } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { sanitizePlacements, SHEET } from "@/lib/letters";
import PrintButton from "@/components/admin/print-button";
import LetterSheet from "@/components/letters/letter-sheet";

export const metadata: Metadata = { title: "Letter", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/*
 * Page 1 has no top margin: the sheet's own padding provides it, so images
 * dragged in the editor land on the same spot on paper. Later pages get a
 * normal top margin. Every page keeps the 16mm bottom margin.
 */
const PRINT_CSS = `
@page { size: A4; margin: 14mm 0 ${SHEET.padBottomMm}mm; }
@page :first { margin: 0 0 ${SHEET.padBottomMm}mm; }
@media print {
  html, body { background: #fff !important; }
  .letter-sheet { min-height: ${SHEET.heightMm - SHEET.padBottomMm}mm !important; padding-bottom: 0 !important; box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default async function LetterPrintPage({ params }: { params: { id: string } }) {
  await requirePermission("letters");

  const db = createClient();
  const [{ data }, settings] = await Promise.all([db.from("letters").select("*").eq("id", params.id).maybeSingle(), getBillingSettings()]);
  if (!data) notFound();
  const row = data as Record<string, unknown>;

  const letter = {
    title: String(row.title ?? ""),
    reference: (row.reference as string | null) ?? null,
    letter_date: String(row.letter_date ?? ""),
    recipient: (row.recipient as string | null) ?? null,
    subject: (row.subject as string | null) ?? null,
    body: String(row.body ?? ""),
    show_letterhead: row.show_letterhead !== false && row.show_letterhead !== 0,
  };

  return (
    <div className="min-h-screen bg-canvas-warm py-6 print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link href={`/admin/letters/${params.id}`} className="text-sm text-brand-700 underline">
          Back to editing
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-text-primary/60 sm:inline">Choose “Save as PDF”, margins: Default, scale: 100%</span>
          <PrintButton />
        </div>
      </div>
      {/* On small screens the sheet scrolls sideways rather than reflowing, so it matches the paper. */}
      <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">
        <div className="mx-auto w-fit shadow-md print:shadow-none">
          <LetterSheet letter={letter} settings={settings} placements={sanitizePlacements(row.placements)} />
        </div>
      </div>
    </div>
  );
}
