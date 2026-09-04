import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  if (doc.status !== "draft" && doc.signature_required && !doc.recipient_signed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-warm p-6">
        <div className="max-w-lg rounded-card border border-warning/40 bg-surface p-8 text-center">
          <p className="section-stamp">SIGNATURE REQUIRED</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">Document not yet verified</h1>
          <p className="mt-3 text-sm leading-6 text-text-primary/75">
            The recipient must upload their PNG signature before this document can be viewed or downloaded.
          </p>
          <Link href={hasRole(profile, "junior_partner") ? `/admin/documents/${doc.id}` : "/staff/documents"} className="mt-6 inline-block text-sm text-brand-700 underline">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: recipientRow }, authRecipient, settings] = await Promise.all([
    doc.recipient_id
      ? supabase
          .from("profiles")
          .select("display_name, email, title, department, employment_type, joined_on, ends_on")
          .eq("id", doc.recipient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    doc.recipient_id
      ? createAdminClient().auth.admin.getUserById(doc.recipient_id)
      : Promise.resolve({ data: { user: null } }),
    getBillingSettings(),
  ]);

  const recipient = recipientRow
    ? {
        ...recipientRow,
        display_name:
          recipientRow.display_name ||
          authRecipient.data.user?.user_metadata?.full_name ||
          authRecipient.data.user?.user_metadata?.name ||
          recipientRow.email,
      }
    : null;

  const backHref = hasRole(profile, "junior_partner") ? `/admin/documents/${doc.id}` : "/staff/documents";

  return (
    <div className="min-h-screen bg-canvas-warm py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link href={backHref} className="text-sm text-brand-700 underline">
          Back
        </Link>
        <PrintButton />
      </div>

      <DocumentLetterhead doc={doc} recipient={recipient as Recipient | null} settings={settings} />
    </div>
  );
}
