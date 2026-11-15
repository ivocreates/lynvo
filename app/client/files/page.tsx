import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { releaseStates, type DeliverableFile } from "@/lib/deliverable-access";
import { formatBytes } from "@/lib/deliverables";
import { formatMoney } from "@/lib/admin/billing";
import { safeUrl } from "@/lib/clients";
import { receiptNumber } from "@/components/documents/payment-receipt";

export const metadata = { title: "Downloads", robots: { index: false, follow: false } };

type Deliverable = DeliverableFile & { version: string | null };

export default async function ClientFilesPage({ searchParams }: { searchParams: { locked?: string } }) {
  const profile = await requireClient();
  const db = createClient();

  const [{ data: engagementRows }, { data: paymentRows }, { data: documentRows }, { data: agreementRows }] = await Promise.all([
    db.from("client_engagements").select("id, title").eq("client_id", profile.client_id).order("created_at", { ascending: false }),
    db.from("billing_payments").select("id, amount, tds_amount, currency, paid_on, document_id").eq("client_id", profile.client_id).order("paid_on", { ascending: false }),
    db.from("billing_documents").select("id, doc_type, number, status, issue_date, total, currency").eq("client_id", profile.client_id).order("issue_date", { ascending: false }),
    db.from("client_agreements").select("id, title, status, issue_date").eq("client_id", profile.client_id).order("issue_date", { ascending: false }),
  ]);

  const engagements = (engagementRows ?? []) as { id: string; title: string }[];
  const { data: deliverableRows } = engagements.length
    ? await db.from("client_deliverables").select("*").in("engagement_id", engagements.map((engagement) => engagement.id)).order("position")
    : { data: [] };
  const deliverables = ((deliverableRows ?? []) as Deliverable[]).filter((deliverable) => deliverable.file_key || safeUrl(deliverable.url));
  const release = await releaseStates(profile.client_id, deliverables);
  const documents = (documentRows ?? []) as { id: string; doc_type: string; number: string; status: string; issue_date: string; total: number; currency: string }[];
  const numberOf = new Map(documents.map((doc) => [doc.id, doc.number]));
  const payments = (paymentRows ?? []) as { id: string; amount: number; tds_amount: number | null; currency: string; paid_on: string; document_id: string }[];
  const agreements = (agreementRows ?? []) as { id: string; title: string; status: string; issue_date: string }[];
  const lockedItem = searchParams.locked ? deliverables.find((deliverable) => deliverable.id === searchParams.locked) : null;

  return (
    <div>
      <p className="section-stamp">DOWNLOADS</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Your files &amp; documents</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Final files unlock automatically once the related payment is cleared. Receipts, invoices and agreements are always available.
      </p>

      {lockedItem && (
        <p className="mt-6 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          &ldquo;{lockedItem.title}&rdquo; isn&apos;t available yet. {release.get(lockedItem.id)?.reason}
        </p>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900">Project files</h2>
        {deliverables.length === 0 ? (
          <p className="mt-3 text-sm text-text-primary/70">Files will appear here as your project is delivered.</p>
        ) : (
          engagements.map((engagement) => {
            const items = deliverables.filter((deliverable) => deliverable.engagement_id === engagement.id);
            if (items.length === 0) return null;
            return (
              <div key={engagement.id} className="mt-5">
                <p className="section-stamp">{engagement.title.toUpperCase()}</p>
                <ul className="mt-2 divide-y divide-border rounded-card border border-border bg-surface">
                  {items.map((deliverable) => {
                    const state = release.get(deliverable.id);
                    const link = safeUrl(deliverable.url);
                    return (
                      <li key={deliverable.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">
                            {deliverable.title}
                            {deliverable.version && <span className="ml-2 font-mono text-xs text-text-primary/60">{deliverable.version}</span>}
                          </p>
                          <p className="mt-0.5 text-xs text-text-primary/60">
                            {deliverable.file_name
                              ? `${deliverable.file_name}${deliverable.file_size ? ` · ${formatBytes(deliverable.file_size)}` : ""}`
                              : "Link"}
                          </p>
                        </div>
                        {state?.released ? (
                          <div className="flex flex-wrap gap-2">
                            {deliverable.file_key && (
                              <a href={`/download/${deliverable.id}`} className="rounded-card bg-ink-900 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-brand-700">
                                Download
                              </a>
                            )}
                            {link && (
                              <a
                                href={`/download/${deliverable.id}?link=1`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="rounded-card border border-border px-4 py-2 text-sm hover:bg-canvas-warm"
                              >
                                Open link
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-right text-xs">
                            <p className="font-medium text-warning">🔒 Locked</p>
                            <p className="text-text-primary/70">{state?.reason}</p>
                            {state && !state.released && state.invoiceId && (
                              <Link href={`/client/quotes/${state.invoiceId}`} className="text-brand-700 underline">
                                {state.balance ? `Pay ${formatMoney(state.balance, state.currency ?? "INR")}` : "View invoice"}
                              </Link>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Payment receipts</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-text-primary/70">No payments yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {payments.map((payment) => (
                <li key={payment.id}>
                  <Link
                    href={`/client/receipts/${payment.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm hover:border-brand-700"
                  >
                    <span>
                      <span className="font-medium text-ink-900">{receiptNumber(payment.id, payment.paid_on)}</span>
                      <span className="block text-xs text-text-primary/60">
                        {payment.paid_on} · {numberOf.get(payment.document_id) ?? "invoice"}
                      </span>
                    </span>
                    <span className="text-ink-900">{formatMoney(Number(payment.amount) + Number(payment.tds_amount ?? 0), payment.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Invoices &amp; quotes</h2>
          {documents.length === 0 ? (
            <p className="mt-3 text-sm text-text-primary/70">Nothing yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/client/quotes/${doc.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm hover:border-brand-700"
                  >
                    <span>
                      <span className="font-medium text-ink-900">{doc.number}</span>
                      <span className="block text-xs capitalize text-text-primary/60">
                        {doc.doc_type} · {doc.status.replace("_", " ")}
                      </span>
                    </span>
                    <span className="text-ink-900">{formatMoney(Number(doc.total), doc.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Agreements</h2>
          {agreements.length === 0 ? (
            <p className="mt-3 text-sm text-text-primary/70">Nothing yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {agreements.map((agreement) => (
                <li key={agreement.id}>
                  <Link
                    href={`/client/documents/${agreement.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm hover:border-brand-700"
                  >
                    <span className="font-medium text-ink-900">{agreement.title}</span>
                    <span className="text-xs capitalize text-text-primary/60">{agreement.status === "sent" ? "to sign" : agreement.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="mt-8 text-xs text-text-primary/60">Open any receipt, invoice or agreement and press &ldquo;Download PDF&rdquo;.</p>
    </div>
  );
}
