import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import { loadReceipt } from "@/lib/billing-view";
import PrintButton from "@/components/admin/print-button";
import PaymentReceipt from "@/components/documents/payment-receipt";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientReceiptPage({ params }: { params: { id: string } }) {
  const profile = await requireClient();

  const [data, settings] = await Promise.all([loadReceipt(params.id), getBillingSettings()]);
  if (!data || data.clientId !== profile.client_id) notFound();

  return (
    <div>
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={`/client/quotes/${data.documentId}`} className="text-sm text-brand-700 underline">
          Back to invoice
        </Link>
        <PrintButton />
      </div>
      <PaymentReceipt receipt={data.receipt} settings={settings} />
    </div>
  );
}
