import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import PageHeader from "@/components/admin/page-header";
import ResourceForm from "@/components/admin/resource-form";

export default async function NewResourcePage({ params }: { params: { resource: string } }) {
  const resource = getResource(params.resource);
  if (!resource) notFound();

  await requireStaff();

  const defaults: Record<string, string> = {};
  for (const field of resource.fields) {
    if (field.type === "boolean") {
      defaults[field.name] = ["active", "is_active"].includes(field.name) ? "true" : "false";
    } else if (field.type === "select") {
      defaults[field.name] = field.options?.[0]?.value ?? "";
    } else if (field.type === "number") {
      defaults[field.name] = "0";
    }
  }

  return (
    <div>
      <PageHeader
        stamp={`${resource.label.toUpperCase()} / NEW`}
        title={`New ${resource.labelSingular.toLowerCase()}`}
      />
      <ResourceForm resource={resource} values={defaults} />
    </div>
  );
}
