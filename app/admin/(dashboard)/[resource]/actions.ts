"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin, recordAudit } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { parseResourceForm } from "@/lib/admin/form";

export type ResourceState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

function revalidateFor(resourceKey: string, table: string) {
  revalidatePath(`/admin/${resourceKey}`);

  const publicPaths: Record<string, string[]> = {
    projects: ["/", "/archive"],
    services: ["/", "/services"],
    blog_posts: ["/blog"],
    team_members: ["/team"],
    reviews: ["/reviews"],
    stats: ["/"],
    social_links: ["/"],
  };

  for (const path of publicPaths[table] ?? []) revalidatePath(path);
}

export async function saveResource(
  _prev: ResourceState,
  formData: FormData
): Promise<ResourceState> {
  await requireStaff();

  const resourceKey = String(formData.get("__resource") ?? "");
  const id = String(formData.get("__id") ?? "");
  const resource = getResource(resourceKey);

  if (!resource) return { ok: false, message: "Unknown resource." };

  const parsed = parseResourceForm(resource, formData);
  if (!parsed.ok) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.errors };
  }

  const values = { ...parsed.data };

  // A post moving to published without an explicit date is published now.
  if (resource.table === "blog_posts" && values.status === "published" && !values.published_at) {
    values.published_at = new Date().toISOString();
  }

  const supabase = createClient();

  if (id) {
    values.updated_at = new Date().toISOString();
    const { error } = await supabase.from(resource.table).update(values).eq("id", id);

    if (error) return { ok: false, message: friendlyError(error.message) };

    await recordAudit("update", resource.table, id, { title: values[resource.titleField] });
  } else {
    const { data, error } = await supabase
      .from(resource.table)
      .insert(values)
      .select("id")
      .single();

    if (error) return { ok: false, message: friendlyError(error.message) };

    await recordAudit("create", resource.table, (data as { id: string }).id, {
      title: values[resource.titleField],
    });
  }

  revalidateFor(resource.key, resource.table);
  redirect(`/admin/${resource.key}?saved=1`);
}

export async function deleteResource(formData: FormData) {
  await requireAdmin();

  const resourceKey = String(formData.get("__resource") ?? "");
  const id = String(formData.get("__id") ?? "");
  const resource = getResource(resourceKey);

  if (!resource || !id) return;

  const supabase = createClient();
  const { error } = await supabase.from(resource.table).delete().eq("id", id);

  if (!error) await recordAudit("delete", resource.table, id);

  revalidateFor(resource.key, resource.table);
  redirect(`/admin/${resource.key}?deleted=${error ? "0" : "1"}`);
}

function friendlyError(message: string) {
  if (message.includes("duplicate key")) return "That slug is already taken. Choose another.";
  if (message.includes("row-level security")) return "You do not have permission to do that.";
  return "Could not save. Please check the values and try again.";
}
