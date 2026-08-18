import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBillingSettings } from "@/lib/admin/billing-settings";
import PageHeader from "@/components/admin/page-header";
import DocumentForm from "@/components/admin/document-form";
import { suggestReference } from "@/lib/documents";
import { createDocument } from "../actions";

export default async function NewDocumentPage() {
  await requireManager();

  const supabase = createClient();
  const [{ data: peopleRows }, { count }, settings] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").eq("is_active", true),
    supabase.from("staff_documents").select("*", { count: "exact", head: true }),
    getBillingSettings(),
  ]);

  const people = ((peopleRows ?? []) as Record<string, any>[]).map((person) => ({
    id: person.id as string,
    label: (person.display_name ?? person.email) as string,
  }));

  return (
    <div>
      <PageHeader
        stamp="HR"
        title="New document"
        description="Paste your formatted text; LYNVO's letterhead and footer are applied automatically."
      />
      <DocumentForm
        people={people}
        action={createDocument}
        submitLabel="Create document"
        referenceSuggestion={suggestReference(settings.doc_reference_prefix, "contract", (count ?? 0) + 1)}
      />
    </div>
  );
}
