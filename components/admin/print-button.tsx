"use client";

/** Opens the browser's print dialog, where "Save as PDF" downloads the document. */
export default function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      title="Choose “Save as PDF” in the print dialog"
      className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
    >
      {label}
    </button>
  );
}
