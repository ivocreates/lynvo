import { createClient } from "@/lib/supabase/server";
import { requireStaff, hasRole } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";
import MediaUploader from "@/components/admin/media-uploader";
import CopyButton from "@/components/admin/copy-button";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteMedia } from "./actions";

export default async function MediaPage() {
  const profile = await requireStaff();
  const canDelete = hasRole(profile, "admin");

  const supabase = createClient();
  const { data: assets } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

  return (
    <div>
      <PageHeader
        stamp="LIBRARY"
        title="Media"
        description="Images available to the public site."
      />

      <MediaUploader />

      {!assets || assets.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No media uploaded yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset: Record<string, any>) => {
            const url = `${base}/${asset.bucket}/${asset.path}`;

            return (
              <li key={asset.id} className="overflow-hidden rounded-card border border-border bg-surface">
                <div className="aspect-video bg-canvas-warm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={asset.alt_text ?? ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate font-mono text-xs text-text-primary/60" title={asset.path}>
                    {asset.path}
                  </p>
                  <p className="truncate text-xs text-text-primary/80">
                    {asset.alt_text || "No alt text"}
                  </p>
                  <div className="flex items-center justify-between">
                    <CopyButton value={url} />
                    {canDelete && (
                      <form action={deleteMedia}>
                        <input type="hidden" name="id" value={asset.id} />
                        <input type="hidden" name="path" value={asset.path} />
                        <ConfirmSubmit
                          message="Delete this file? Pages still referencing it will show a broken image."
                          className="text-xs text-error underline"
                        />
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
