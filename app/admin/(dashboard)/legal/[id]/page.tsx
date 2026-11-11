import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, hasRole } from "@/lib/auth";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import Flash from "@/components/admin/flash";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SubmitButton from "@/components/admin/submit-button";
import AgreementDocument, { type AgreementRecord } from "@/components/documents/agreement-document";
import { deleteAgreement, setAgreementStatus, updateAgreement } from "../actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";
const BUTTON = "rounded-card border border-border px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-canvas-warm";

export default async function AgreementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; saved?: string; error?: string };
}) {
  const profile = await requirePermission("clients.manage");
  const isAdmin = hasRole(profile, "admin");

  const supabase = createClient();
  const [{ data: row }, settings] = await Promise.all([
    supabase.from("client_agreements").select("*, clients(id, name)").eq("id", params.id).maybeSingle(),
    getBillingSettings(),
  ]);
  if (!row) notFound();

  const agreement = row as unknown as AgreementRecord & { id: string; client_id: string; clients: { id: string; name: string } | null };
  const clientName = agreement.clients?.name ?? "Client";
  const locked = agreement.status === "signed" || agreement.status === "void";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/legal" className="text-sm text-brand-700 underline">
            Agreements
          </Link>
          <p className="section-stamp mb-1 mt-3">{agreement.reference ?? "AGREEMENT"}</p>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{agreement.title}</h1>
          <p className="mt-1 text-sm text-text-primary/70">
            <Link href={`/admin/clients/${agreement.client_id}/legal`} className="text-brand-700 underline">
              {clientName}
            </Link>{" "}
            · {agreement.status === "sent" ? "awaiting the client's signature in their portal" : agreement.status}
            {agreement.signed_at &&
              ` · signed by ${agreement.signer_name}${agreement.signer_designation ? ` (${agreement.signer_designation})` : ""} on ${new Date(agreement.signed_at).toLocaleString("en-IN")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/print/agreement/${agreement.id}`} className={BUTTON}>
            Print / PDF
          </Link>
          {agreement.status === "draft" && (
            <StatusForm id={agreement.id} status="sent" label={agreement.signature_required ? "Send for signature" : "Share with client"} primary />
          )}
          {agreement.status === "sent" && !agreement.signature_required && <StatusForm id={agreement.id} status="signed" label="Mark completed" />}
          {agreement.status === "sent" && <StatusForm id={agreement.id} status="draft" label="Back to draft" />}
          {agreement.status !== "void" && <StatusForm id={agreement.id} status="void" label="Void" />}
          {isAdmin && (
            <form action={deleteAgreement}>
              <input type="hidden" name="id" value={agreement.id} />
              <ConfirmSubmit message="Delete this agreement permanently?" className={`${BUTTON} text-error`} />
            </form>
          )}
        </div>
      </div>

      <Flash
        success={searchParams.created ? "Draft generated. Review the wording, then send it." : searchParams.saved ? "Saved." : null}
        error={searchParams.error}
      />

      <div className="grid gap-6 2xl:grid-cols-2">
        {!locked ? (
          <form action={updateAgreement} className="space-y-4 rounded-card border border-border bg-surface p-5">
            <input type="hidden" name="id" value={agreement.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label htmlFor="title" className={LABEL}>
                  Title
                </label>
                <input id="title" name="title" defaultValue={agreement.title} required className={FIELD} />
              </div>
              <div>
                <label htmlFor="reference" className={LABEL}>
                  Reference
                </label>
                <input id="reference" name="reference" defaultValue={agreement.reference ?? ""} className={FIELD} />
              </div>
              <div>
                <label htmlFor="issue_date" className={LABEL}>
                  Date
                </label>
                <input id="issue_date" name="issue_date" type="date" defaultValue={agreement.issue_date} className={FIELD} />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-ink-900">
                <input type="checkbox" name="signature_required" defaultChecked={agreement.signature_required} className="h-4 w-4 accent-brand-700" />
                Client must sign
              </label>
            </div>
            <div>
              <label htmlFor="body" className={LABEL}>
                Wording
              </label>
              <textarea id="body" name="body" rows={30} defaultValue={agreement.body} className={`${FIELD} font-mono text-[13px] leading-6`} />
              <p className="mt-1 text-xs text-text-primary/60">
                <code># </code> heading · <code>- </code> bullet · <code>| a | b |</code> table · <code>---</code> new page.
              </p>
            </div>
            <SubmitButton>Save changes</SubmitButton>
          </form>
        ) : (
          <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-primary/70">
            {agreement.status === "signed" ? "Signed agreements are locked so the record cannot change." : "This agreement is void."}
          </p>
        )}

        <div className="overflow-x-auto">
          <AgreementDocument agreement={agreement} clientName={clientName} settings={settings} />
        </div>
      </div>
    </div>
  );
}

function StatusForm({ id, status, label, primary = false }: { id: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setAgreementStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={primary ? "rounded-card bg-brand-700 px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-ink-900" : BUTTON}
      >
        {label}
      </button>
    </form>
  );
}
