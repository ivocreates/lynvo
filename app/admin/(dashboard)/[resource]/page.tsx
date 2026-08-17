import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, hasRole } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import PageHeader from "@/components/admin/page-header";
import SearchInput from "@/components/admin/search-input";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteResource } from "./actions";

function renderCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "—";
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export default async function ResourceListPage({
  params,
  searchParams,
}: {
  params: { resource: string };
  searchParams: { q?: string; saved?: string; deleted?: string };
}) {
  const resource = getResource(params.resource);
  if (!resource) notFound();

  const profile = await requireStaff();
  const canDelete = hasRole(profile, "admin");

  const supabase = createClient();
  let query = supabase
    .from(resource.table)
    .select("*")
    .order(resource.orderBy.column, { ascending: resource.orderBy.ascending })
    .limit(200);

  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,()]/g, "");
    const filter = resource.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(",");
    query = query.or(filter);
  }

  const { data: rows, error } = await query;
  const columns = resource.fields.filter((field) => field.inList);

  return (
    <div>
      <PageHeader
        stamp={resource.label.toUpperCase()}
        title={resource.label}
        description={`${rows?.length ?? 0} record${rows?.length === 1 ? "" : "s"}`}
        action={{ href: `/admin/${resource.key}/new`, label: `New ${resource.labelSingular.toLowerCase()}` }}
      />

      {searchParams.saved && (
        <p className="mb-4 rounded-card border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          Saved successfully.
        </p>
      )}
      {searchParams.deleted === "1" && (
        <p className="mb-4 rounded-card border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          Deleted successfully.
        </p>
      )}
      {searchParams.deleted === "0" && (
        <p className="mb-4 rounded-card border border-error/40 bg-error/10 px-4 py-2 text-sm text-error">
          Could not delete that record.
        </p>
      )}

      <SearchInput placeholder={`Search ${resource.label.toLowerCase()}...`} />

      {error ? (
        <p className="rounded-card border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load records.
        </p>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-primary/70">
            {searchParams.q
              ? "No records match that search."
              : `No ${resource.label.toLowerCase()} yet.`}
          </p>
          <Link
            href={`/admin/${resource.key}/new`}
            className="mt-3 inline-block text-sm text-brand-700 underline"
          >
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-canvas-warm">
              <tr>
                {columns.map((column) => (
                  <th key={column.name} className="px-4 py-3 font-medium text-ink-900">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-ink-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: Record<string, unknown>) => (
                <tr key={String(row.id)} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td key={column.name} className="px-4 py-3 text-text-primary/85">
                      {renderCell(row[column.name])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/${resource.key}/${row.id}`}
                        className="text-sm text-brand-700 underline"
                      >
                        Edit
                      </Link>
                      {canDelete && (
                        <form action={deleteResource}>
                          <input type="hidden" name="__resource" value={resource.key} />
                          <input type="hidden" name="__id" value={String(row.id)} />
                          <ConfirmSubmit
                            message={`Delete this ${resource.labelSingular.toLowerCase()}? This cannot be undone.`}
                          />
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
