import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember, hasRole } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PrintButton from "@/components/admin/print-button";
import DocumentLetterhead from "@/components/documents/letterhead";
import type { Recipient, StaffDocument } from "@/lib/documents";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DocumentPrintPage({ params }: { params: { id: string } }) {
  const profile = await requireTeamMember();

  const supabase = createClient();
  // RLS decides visibility: managers see drafts, recipients see issued documents.
  const { data } = await supabase.from("staff_documents").select("*").eq("id", params.id).maybeSingle();

  if (!data) notFound();
  const doc = data as unknown as StaffDocument;

  const [{ data: recipientRow }, settings] = await Promise.all([
    doc.recipient_id
      ? supabase
          .from("profiles")
          .select("display_name, email, title, department, employment_type, joined_on, ends_on")
          .eq("id", doc.recipient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getBillingSettings(),
  ]);

  const backHref = hasRole(profile, "junior_partner") ? `/admin/documents/${doc.id}` : "/staff/documents";

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link href={backHref} className="text-sm text-brand-700 underline">
          Back
        </Link>
        <PrintButton />
      </div>

      <DocumentLetterhead doc={doc} recipient={recipientRow as Recipient | null} settings={settings} />
    </div>
  );
}
