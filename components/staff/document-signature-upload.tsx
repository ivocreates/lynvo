"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocumentSignature } from "@/app/staff/documents/actions";

export default function DocumentSignatureUpload({ documentId }: { documentId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setMessage(null);
    const formData = new FormData();
    formData.append("id", documentId);
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDocumentSignature(formData);
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-sm font-medium text-ink-900">Signature required before download</p>
      <p className="mt-1 text-xs leading-5 text-text-primary/60">Upload a clear PNG image of your signature.</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/png"
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
        className="mt-3 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
      >
        {pending ? "Uploading..." : "Upload PNG signature"}
      </button>
      {message && <p className="mt-2 text-xs text-text-primary/70">{message}</p>}
    </div>
  );
}