import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { loadBillingView } from "@/lib/billing-view";
import PrintButton from "@/components/admin/print-button";
import BillingDocument from "@/components/documents/billing-document";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BillingPrintPage({ params }: { params: { id: string } }) {
  await requirePermission("billing.manage");

  const [view, settings] = await Promise.all([loadBillingView(params.id), getBillingSettings()]);
  if (!view) notFound();

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>

      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link href={`/admin/billing/${params.id}`} className="text-sm text-brand-700 underline">
          Back to document
        </Link>
        <PrintButton />
      </div>

      <BillingDocument doc={view.doc} items={view.items} settings={settings} payments={view.payments} project={view.project} />
    </div>
  );
}
