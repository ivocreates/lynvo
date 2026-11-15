import { NextResponse, type NextRequest } from "next/server";
import { can, getCurrentProfile, recordAudit } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/db/server";
import { getMediaBucket } from "@/lib/db/cloudflare";
import { MAX_DELIVERABLE_BYTES, safeFileName } from "@/lib/deliverables";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PUT /admin/files/upload?deliverable=<id>&name=<file name>
 * Body: the raw file. Streamed straight into R2 (private/), never buffered.
 */
export async function PUT(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !(await can(profile, "clients.manage"))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const deliverableId = request.nextUrl.searchParams.get("deliverable") ?? "";
  const name = safeFileName(request.nextUrl.searchParams.get("name") ?? "file");
  const size = Number(request.headers.get("content-length") ?? 0);
  const type = (request.headers.get("content-type") || "application/octet-stream").slice(0, 120);

  if (!UUID.test(deliverableId)) return NextResponse.json({ error: "Unknown deliverable" }, { status: 400 });
  if (!size || !request.body) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (size > MAX_DELIVERABLE_BYTES) return NextResponse.json({ error: "Files can be up to 100 MB. Split large packs into several ZIPs." }, { status: 413 });

  // The caller must be able to see the deliverable (policies apply).
  const { data: deliverable } = await createClient().from("client_deliverables").select("id, file_key").eq("id", deliverableId).maybeSingle();
  if (!deliverable) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });

  const key = `private/deliverables/${deliverableId}/${crypto.randomUUID()}-${name}`;
  try {
    // R2 needs a stream of known length; FixedLengthStream (a Workers global)
    // provides it without buffering the whole file in memory.
    const Fixed = (globalThis as { FixedLengthStream?: new (length: number) => TransformStream }).FixedLengthStream;
    if (Fixed) {
      const { readable, writable } = new Fixed(size);
      await Promise.all([request.body.pipeTo(writable), getMediaBucket().put(key, readable, { httpMetadata: { contentType: type } })]);
    } else {
      await getMediaBucket().put(key, await request.arrayBuffer(), { httpMetadata: { contentType: type } });
    }
  } catch (error) {
    console.error("[upload] R2 put failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const system = createAdminClient();
  await system
    .from("client_deliverables")
    .update({ file_key: key, file_name: name, file_size: size, file_type: type, kind: "file" })
    .eq("id", deliverableId);
  // Replacing a file removes the old one.
  if (deliverable.file_key && deliverable.file_key !== key) await getMediaBucket().delete(String(deliverable.file_key)).catch(() => undefined);

  await recordAudit("upload", "client_deliverables", deliverableId, { name, size });
  return NextResponse.json({ ok: true, name, size });
}
