import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { toFieldValue } from "@/lib/admin/form";
import PageHeader from "@/components/admin/page-header";
import ResourceForm from "@/components/admin/resource-form";

export default async function EditResourcePage({
  params,
}: {
  params: { resource: string; id: string };
}) {
  const resource = getResource(params.resource);
  if (!resource) notFound();

  await requireStaff();

  const supabase = createClient();
  const { data: row } = await supabase
    .from(resource.table)
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!row) notFound();

  const values: Record<string, string> = {};
  for (const field of resource.fields) {
    const raw = (row as Record<string, unknown>)[field.name];
    values[field.name] =
      field.type === "boolean" ? String(Boolean(raw)) : toFieldValue(field, raw);
  }

  return (
    <div>
      <PageHeader
        stamp={`${resource.label.toUpperCase()} / EDIT`}
        title={String((row as Record<string, unknown>)[resource.titleField] ?? resource.labelSingular)}
      />
      <ResourceForm resource={resource} values={values} id={params.id} />
    </div>
  );
}
