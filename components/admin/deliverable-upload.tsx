"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { MAX_DELIVERABLE_BYTES, formatBytes } from "@/lib/deliverables";

/** Uploads one file to a deliverable (streamed to private R2) with a progress bar. */
export default function DeliverableUpload({ deliverableId, current }: { deliverableId: string; current?: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_DELIVERABLE_BYTES) {
      setMessage(`${file.name} is ${formatBytes(file.size)}. The limit is 100 MB — split it into smaller ZIPs.`);
      return;
    }
    setMessage("");
    setProgress(0);
    const request = new XMLHttpRequest();
    request.open("PUT", `/admin/files/upload?deliverable=${deliverableId}&name=${encodeURIComponent(file.name)}`);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round((event.loaded / event.total) * 100));
    request.onload = () => {
      setProgress(null);
      if (request.status >= 200 && request.status < 300) {
        setMessage(`Uploaded ${file.name}.`);
        router.refresh();
      } else {
        try {
          setMessage(JSON.parse(request.responseText).error ?? "Upload failed.");
        } catch {
          setMessage("Upload failed.");
        }
      }
      if (input.current) input.current.value = "";
    };
    request.onerror = () => {
      setProgress(null);
      setMessage("Upload failed. Check your connection and try again.");
    };
    request.send(file);
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        upload(event.dataTransfer.files?.[0]);
      }}
      className="rounded-card border border-dashed border-border bg-canvas-warm/50 p-2 text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
          className="inline-flex items-center gap-1.5 rounded-card bg-brand-700 px-2.5 py-1 font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
        >
          <UploadCloud aria-hidden="true" className="h-3.5 w-3.5" />
          {current ? "Replace file" : "Upload file"}
        </button>
        <span className="text-text-primary/60">ZIP, PDF, AI, PSD, fonts… up to 100 MB. Drag a file here.</span>
      </div>
      {progress !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && <p className={`mt-1 ${message.startsWith("Uploaded") ? "text-success" : "text-error"}`}>{message}</p>}
      <input ref={input} type="file" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
    </div>
  );
}
