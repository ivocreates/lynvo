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
  // Individually addressed documents must be acknowledged; signature is required if marked or pending.
  const requiresAck = !!doc.recipient_id;
  const signaturePending = doc.signature_required && !doc.recipient_signed_at;
  const ackPending = requiresAck && !doc.acknowledged_at;
  const locked = doc.status !== "draft" && (signaturePending || ackPending);
  const lockReason = signaturePending
    ? "Download & print locked until the recipient signs and acknowledges"
    : "Download & print locked until the recipient acknowledges";

  const [{ data: recipientRow }, authRecipient, settings] = await Promise.all([
    doc.recipient_id
      ? supabase
          .from("profiles")
          .select("display_name, email, title, department, employment_type, joined_on, ends_on")
          .eq("id", doc.recipient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    doc.recipient_id
      ? (async () => {
          try {
            return await createAdminClient().auth.admin.getUserById(doc.recipient_id!);
          } catch {
            return { data: { user: null } };
          }
        })()
      : Promise.resolve({ data: { user: null } }),
    getBillingSettings(),
  ]);

  const recipient = recipientRow
    ? {
        ...recipientRow,
        display_name:
          recipientRow.display_name ||
          authRecipient?.data?.user?.user_metadata?.full_name ||
          authRecipient?.data?.user?.user_metadata?.name ||
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
        {locked ? (
          <span className="rounded-card border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
            {lockReason}
          </span>
        ) : (
          <PrintButton />
        )}
      </div>

      {/* Anyone with access can preview; the printed output is swapped out below until signed and acknowledged. */}
      <div className={locked ? "print:hidden" : undefined}>
        <DocumentLetterhead doc={doc} recipient={recipient as Recipient | null} settings={settings} />
      </div>
      {locked && (
        <div className="hidden min-h-screen items-center justify-center bg-white p-10 text-center print:flex">
          <p className="text-sm">
            This document cannot be printed until the recipient signs and acknowledges it.
          </p>
        </div>
      )}
    </div>
  );
}
