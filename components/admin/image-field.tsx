"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadImageAction } from "@/app/admin/(dashboard)/media/actions";

/**
 * Image picker for CMS forms: upload from the computer (or drag & drop),
 * preview, replace or remove. The stored value is the public URL, so pasting
 * a URL still works.
 */
export default function ImageField({
  name,
  label,
  defaultValue,
  folder,
  help,
  aspect = "landscape",
}: {
  name: string;
  label: string;
  defaultValue: string;
  folder: "team" | "blog" | "projects" | "services" | "media";
  help?: string;
  aspect?: "landscape" | "square";
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("That image is larger than 5 MB. Compress it (e.g. squoosh.app) and try again.");
      return;
    }
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.append("file", file);
    data.append("folder", folder);
    data.append("alt_text", label);
    try {
      const result = await uploadImageAction(data);
      if (result.ok && result.url) setUrl(result.url);
      else setMessage(result.message);
    } catch {
      setMessage("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-ink-900">{label}</span>
      <input type="hidden" name={name} value={url} />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files?.[0]);
        }}
        className={`mt-1 flex flex-wrap items-center gap-4 rounded-card border border-dashed p-3 transition-colors ${
          dragging ? "border-brand-700 bg-brand-700/5" : "border-border bg-surface"
        }`}
      >
        <div
          className={`relative shrink-0 overflow-hidden rounded-card border border-border bg-canvas-warm ${
            aspect === "square" ? "h-24 w-24" : "h-24 w-40"
          }`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-text-primary/50">No image</span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand-700" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-card bg-brand-700 px-3 py-1.5 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              {url ? "Replace image" : "Upload image"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="inline-flex items-center gap-1.5 rounded-card border border-border px-3 py-1.5 text-sm text-ink-900 hover:bg-canvas-warm"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-text-primary/60">Drag an image here, or click upload. JPG, PNG, WebP up to 5 MB.</p>
          <details className="text-xs">
            <summary className="cursor-pointer text-brand-700">Or paste an image URL</summary>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-card border border-border bg-canvas-warm px-2 py-1.5 text-sm focus:border-brand-700 focus:outline-none"
            />
          </details>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </div>
      {message && <p className="mt-1 text-xs text-error">{message}</p>}
      {help && !message && <p className="mt-1 text-xs text-text-primary/60">{help}</p>}
    </div>
  );
}
