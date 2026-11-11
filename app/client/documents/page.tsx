import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientDocumentsPage() {
  const profile = await requireClient();

  const supabase = createClient();
  const { data } = await supabase
    .from("client_agreements")
    .select("id, title, reference, status, issue_date, signature_required, signed_at")
    .eq("client_id", profile.client_id)
    .order("issue_date", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    title: string;
    reference: string | null;
    status: string;
    issue_date: string;
    signature_required: boolean;
    signed_at: string | null;
  }[];
  const toSign = rows.filter((row) => row.status === "sent" && row.signature_required);

  return (
    <div>
      <p className="section-stamp">AGREEMENTS</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Agreements &amp; documents</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Contracts, consents and handover documents between you and LYNVO. Documents waiting for you can be signed online.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          Nothing here yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((row) => {
            const pending = row.status === "sent" && row.signature_required;
            return (
              <li key={row.id}>
                <Link
                  href={`/client/documents/${row.id}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-card border bg-surface p-5 hover:border-brand-700 ${
                    pending ? "border-brand-700/50" : "border-border"
                  }`}
                >
                  <div>
                    <p className="font-medium text-ink-900">{row.title}</p>
                    <p className="mt-1 text-sm text-text-primary/70">
                      {row.reference ?? ""} · {row.issue_date}
                    </p>
                  </div>
                  <span
                    className={`rounded-card border px-2.5 py-1 text-xs ${
                      pending ? "border-brand-700/40 bg-brand-700/10 text-brand-700" : "border-success/40 bg-success/10 text-success"
                    }`}
                  >
                    {pending ? "Needs your signature" : row.status === "signed" ? "Signed" : "For your records"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {toSign.length > 0 && (
        <p className="mt-6 text-sm text-text-primary/70">
          {toSign.length} document{toSign.length === 1 ? "" : "s"} waiting for your signature.
        </p>
      )}
    </div>
  );
}
