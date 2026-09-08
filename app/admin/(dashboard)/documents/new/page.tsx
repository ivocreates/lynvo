import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PageHeader from "@/components/admin/page-header";
import DocumentForm from "@/components/admin/document-form";
import { suggestReference } from "@/lib/documents";
import { createDocument } from "../actions";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireManager();

  const supabase = createClient();
  const [{ data: peopleRows }, { data: latest }, settings] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").eq("is_active", true),
    // Sequence off the newest reference, not the row count: deleted rows would replay a taken number.
    supabase
      .from("staff_documents")
      .select("reference")
      .not("reference", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getBillingSettings(),
  ]);

  const people = ((peopleRows ?? []) as Record<string, any>[]).map((person) => ({
    id: person.id as string,
    label: (person.display_name ?? person.email) as string,
  }));

  const lastSequence = Number(String((latest as { reference?: string } | null)?.reference ?? "").match(/(\d+)$/)?.[1] ?? 0);

  return (
    <div>
      <PageHeader
        stamp="HR"
        title="New document"
        description="Paste your formatted text; LYNVO's letterhead and footer are applied automatically."
      />
      {searchParams.error && (
        <p className="mb-6 rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {searchParams.error}
        </p>
      )}
      <DocumentForm
        people={people}
        action={createDocument}
        submitLabel="Create document"
        referenceSuggestion={suggestReference(settings.doc_reference_prefix, "contract", lastSequence + 1)}
      />
    </div>
  );
}
