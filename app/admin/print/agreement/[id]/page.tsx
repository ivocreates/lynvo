import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PrintButton from "@/components/admin/print-button";
import AgreementDocument, { type AgreementRecord } from "@/components/documents/agreement-document";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AgreementPrintPage({ params }: { params: { id: string } }) {
  await requirePermission("clients.manage");

  const supabase = createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("client_agreements").select("*, clients(name)").eq("id", params.id).maybeSingle(),
    getBillingSettings(),
  ]);
  if (!data) notFound();
  const agreement = data as unknown as AgreementRecord & { clients: { name: string } | null };

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link href={`/admin/legal/${params.id}`} className="text-sm text-brand-700 underline">
          Back to agreement
        </Link>
        <PrintButton />
      </div>
      <AgreementDocument agreement={agreement} clientName={agreement.clients?.name ?? "Client"} settings={settings} />
    </div>
  );
}
