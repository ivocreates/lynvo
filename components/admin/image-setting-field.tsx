"use client";

import { useRef, useState, useTransition } from "react";
import { uploadSettingsImage } from "@/app/admin/(dashboard)/billing/actions";

const inputClass =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";

/** A settings field that stores a URL but can also upload a file directly. */
export default function ImageSettingField({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadSettingsImage(formData);
      setMessage(result.message);
      if (result.ok && result.url) setValue(result.url);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste a URL or upload a file"
          className={`${inputClass} mt-0 flex-1`}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="rounded-card border border-border px-3 py-2 text-sm font-medium text-ink-900 hover:bg-canvas-warm disabled:opacity-60"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-14 w-auto max-w-[220px] object-contain" />
      )}
      {message && <p className="mt-1 text-xs text-text-primary/70">{message}</p>}
    </div>
  );
}
