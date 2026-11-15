import { getMediaBucket } from "@/lib/db/cloudflare";

/** Serves uploaded files from R2. Keys are random UUIDs, so they are safe to cache forever. */
export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const key = params.path.map((part) => decodeURIComponent(part)).join("/");
  // private/ holds paid deliverables: only /download/<id> may serve them.
  if (!key || key.includes("..") || key.startsWith("private/")) return new Response("Not found", { status: 404 });

  const object = await getMediaBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const type = object.httpMetadata?.contentType ?? "application/octet-stream";
  return new Response(object.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
      // SVGs could carry scripts; never let them run as documents.
      ...(type === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
