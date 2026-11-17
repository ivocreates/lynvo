"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { removeTeamPhoto, uploadTeamPhoto } from "@/app/actions/team-photo";

/** Portrait photo with upload / replace / remove. Saves straight away. */
export default function PhotoField({ profileId, name, initialUrl }: { profileId: string; name: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  async function run(action: typeof uploadTeamPhoto, file?: File) {
    setBusy(true);
    setMessage(null);
    const data = new FormData();
    data.append("id", profileId);
    if (file) data.append("file", file);
    try {
      const result = await action(data);
      if (result.ok) setUrl(result.url ?? null);
      setMessage({ ok: result.ok, text: result.message });
    } catch {
      setMessage({ ok: false, text: "Upload failed. Check your connection and try again." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative h-28 w-[5.6rem] shrink-0 overflow-hidden rounded-card bg-gradient-to-br from-brand-700 to-ink-900"
        aria-label={url ? "Replace photo" : "Upload photo"}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center font-display text-2xl font-semibold text-text-inverse/80">{initials}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink-900/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin text-white" /> : <Camera aria-hidden className="h-5 w-5 text-white" />}
        </span>
      </button>
      <div className="space-y-2 text-sm">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="block rounded-card border border-border bg-surface px-3 py-2 font-medium text-ink-900 hover:bg-canvas-warm disabled:opacity-60"
        >
          {busy ? "Saving…" : url ? "Replace photo" : "Upload photo"}
        </button>
        {url && (
          <button type="button" onClick={() => run(removeTeamPhoto)} disabled={busy} className="text-xs text-error underline">
            Remove photo
          </button>
        )}
        <p className="text-xs text-text-primary/60">Portrait (4:5) works best. JPG, PNG or WebP, up to 5 MB.</p>
        {message && <p className={`text-xs ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) run(uploadTeamPhoto, file);
        }}
      />
    </div>
  );
}
