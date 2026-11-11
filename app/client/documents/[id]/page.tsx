import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PrintButton from "@/components/admin/print-button";
import SubmitButton from "@/components/admin/submit-button";
import AgreementDocument, { type AgreementRecord } from "@/components/documents/agreement-document";
import { signAgreement } from "../../actions";

export const metadata = { robots: { index: false, follow: false } };

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

export default async function ClientAgreementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { signed?: string; error?: string };
}) {
  const profile = await requireClient();

  const supabase = createClient();
  const [{ data }, { data: client }, settings] = await Promise.all([
    supabase.from("client_agreements").select("*").eq("id", params.id).eq("client_id", profile.client_id).maybeSingle(),
    supabase.from("clients").select("name").eq("id", profile.client_id).maybeSingle(),
    getBillingSettings(),
  ]);
  if (!data) notFound();

  const agreement = data as unknown as AgreementRecord & { id: string };
  const clientName = (client as { name: string } | null)?.name ?? "Client";
  const canSign = agreement.status === "sent" && agreement.signature_required;

  return (
    <div>
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href="/client/documents" className="text-sm text-brand-700 underline">
          Back to agreements
        </Link>
        <PrintButton />
      </div>

      {searchParams.signed && (
        <p className="mb-6 rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success print:hidden">
          Signed. A copy is saved here for your records.
        </p>
      )}
      {searchParams.error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error print:hidden">
          {searchParams.error === "confirm" ? "Type your full name and tick the box to sign." : "We could not record your signature. Please try again."}
        </p>
      )}

      {canSign && (
        <form action={signAgreement} className="mb-6 rounded-card border border-brand-700/40 bg-surface p-5 print:hidden">
          <input type="hidden" name="id" value={agreement.id} />
          <h2 className="font-display text-lg font-semibold text-ink-900">Sign this document</h2>
          <p className="mt-1 text-sm text-text-primary/75">
            Read the document below. Typing your name and ticking the box is your electronic signature on behalf of {clientName}.
            The date and time are recorded.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="signer" className="block text-sm font-medium text-ink-900">
                Full name
              </label>
              <input id="signer" name="signer" required minLength={2} defaultValue={profile.display_name ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-ink-900">
                Designation
              </label>
              <input id="designation" name="designation" placeholder="e.g. Founder, Director" className={FIELD} />
            </div>
            <SubmitButton pendingLabel="Signing...">Sign</SubmitButton>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-900">
            <input type="checkbox" name="agree" required className="h-4 w-4 accent-brand-700" />
            I have read this document and I am authorised to sign it for {clientName}.
          </label>
        </form>
      )}

      <AgreementDocument agreement={agreement} clientName={clientName} settings={settings} />
    </div>
  );
}
