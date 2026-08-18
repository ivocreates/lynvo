import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/page-header";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import DocumentForm from "@/components/admin/document-form";
import { applyPlaceholders, type Recipient, type StaffDocument } from "@/lib/documents";
import { updateDocument, setDocumentStatus, deleteDocument } from "../actions";

export default async function EditDocumentPage({ params }: { params: { id: string } }) {
  await requireManager();

  const supabase = createClient();
  const { data } = await supabase.from("staff_documents").select("*").eq("id", params.id).maybeSingle();

  if (!data) notFound();
  const doc = data as unknown as StaffDocument;

  const [{ data: peopleRows }, { data: recipientRow }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").eq("is_active", true),
    doc.recipient_id
      ? supabase
          .from("profiles")
          .select("display_name, email, title, department, employment_type, joined_on, ends_on")
          .eq("id", doc.recipient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const people = ((peopleRows ?? []) as Record<string, any>[]).map((person) => ({
    id: person.id as string,
    label: (person.display_name ?? person.email) as string,
  }));
  const recipient = recipientRow as Recipient | null;

  // No email provider is configured, so hand the rendered text to the OS mail client.
  const mailBody = applyPlaceholders(doc.body, doc, recipient);
  const mailto = `mailto:${recipient?.email ?? ""}?subject=${encodeURIComponent(
    `${doc.title}${doc.reference ? ` (${doc.reference})` : ""}`
  )}&body=${encodeURIComponent(mailBody.slice(0, 1800))}`;

  return (
    <div>
      <PageHeader stamp="HR" title={doc.title} description={`Status: ${doc.status}`} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/print/document/${doc.id}`}
          className="rounded-card border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          Preview &amp; print
        </Link>

        {doc.status !== "issued" && (
          <form action={setDocumentStatus}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="status" value="issued" />
            <button
              type="submit"
              className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
            >
              Issue to recipient
            </button>
          </form>
        )}
        {doc.status === "issued" && (
          <form action={setDocumentStatus}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="status" value="archived" />
            <button type="submit" className="rounded-card border border-border px-4 py-2 text-sm hover:bg-surface">
              Archive
            </button>
          </form>
        )}

        {recipient?.email && (
          <a href={mailto} className="rounded-card border border-border px-4 py-2 text-sm hover:bg-surface">
            Send by email
          </a>
        )}

        <form action={deleteDocument} className="ml-auto">
          <input type="hidden" name="id" value={doc.id} />
          <ConfirmSubmit message="Delete this document permanently?" />
        </form>
      </div>

      {doc.acknowledged_at && (
        <p className="mb-6 rounded-card border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Acknowledged by the recipient on {new Date(doc.acknowledged_at).toLocaleString()}.
        </p>
      )}

      <DocumentForm doc={doc} people={people} action={updateDocument} submitLabel="Save changes" />
    </div>
  );
}
