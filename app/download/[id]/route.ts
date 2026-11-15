import { NextResponse, type NextRequest } from "next/server";
import { getRequestContext, createAdminClient, createClient } from "@/lib/db/server";
import { hasPermission } from "@/lib/db/context";
import { getMediaBucket } from "@/lib/db/cloudflare";
import { releaseStates, type DeliverableFile } from "@/lib/deliverable-access";
import { safeUrl } from "@/lib/clients";

/**
 * GET /download/<deliverable id>
 * Team members with client access can always download. A client can download
 * only their own, visible, released deliverables. Links redirect only once released.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getRequestContext();
  if (!ctx.userId) return NextResponse.redirect(new URL(`/login?as=client&next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));

  // Policies decide visibility: clients only see their own visible deliverables.
  const { data } = await createClient()
    .from("client_deliverables")
    .select("id, engagement_id, title, file_key, file_name, file_type, file_size, url, release_rule, invoice_id, released_at, visible_to_client")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });
  const deliverable = data as DeliverableFile;

  const isStaff = hasPermission(ctx, "clients.manage");
  if (!isStaff) {
    if (!ctx.clientId) return new NextResponse("Not found", { status: 404 });
    const state = (await releaseStates(ctx.clientId, [deliverable])).get(deliverable.id);
    if (!state?.released) return NextResponse.redirect(new URL(`/client/files?locked=${deliverable.id}`, request.url));
  }

  const preferLink = request.nextUrl.searchParams.get("link") === "1";
  const link = safeUrl(deliverable.url);
  if ((preferLink || !deliverable.file_key) && link) {
    if (!isStaff) await countDownload(deliverable.id);
    return NextResponse.redirect(link);
  }
  if (!deliverable.file_key) return new NextResponse("Nothing to download yet", { status: 404 });

  const object = await getMediaBucket().get(deliverable.file_key);
  if (!object) return new NextResponse("File missing — please contact LYNVO", { status: 404 });

  if (!isStaff) await countDownload(deliverable.id);
  const filename = (deliverable.file_name || "download").replace(/"/g, "");
  return new NextResponse(object.body, {
    headers: {
      "Content-Type": deliverable.file_type || object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(object.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function countDownload(id: string) {
  const system = createAdminClient();
  const { data } = await system.from("client_deliverables").select("download_count").eq("id", id).maybeSingle();
  await system
    .from("client_deliverables")
    .update({ download_count: Number(data?.download_count ?? 0) + 1, last_downloaded_at: new Date().toISOString() })
    .eq("id", id);
}
