"use client";

import { useRef, useState } from "react";
import { Bold, Heading2, ImagePlus, Italic, Link2, List, Loader2, Quote } from "lucide-react";
import { uploadImageAction } from "@/app/admin/(dashboard)/media/actions";
import Markdown from "@/components/ui/markdown";

/** Markdown textarea with a toolbar, image upload into the text, and a live preview. */
export default function MarkdownEditor({
  name,
  defaultValue,
  folder = "blog",
  describedBy,
  invalid,
}: {
  name: string;
  defaultValue: string;
  folder?: "blog" | "projects" | "services" | "media";
  describedBy?: string;
  invalid?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Wraps the selection (or inserts at the cursor) and keeps focus in the editor. */
  function insert(before: string, after = "", placeholder = "") {
    const element = area.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      element.focus();
      const cursor = start + before.length + selected.length;
      element.setSelectionRange(start + before.length, cursor);
    });
  }

  function insertBlock(text: string) {
    const element = area.current;
    const position = element?.selectionStart ?? value.length;
    const prefix = position > 0 && value[position - 1] !== "\n" ? "\n\n" : "";
    const next = `${value.slice(0, position)}${prefix}${text}\n\n${value.slice(position)}`;
    setValue(next);
  }

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMessage("");
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage(`${file.name} is larger than 5 MB and was skipped.`);
        continue;
      }
      const data = new FormData();
      data.append("file", file);
      data.append("folder", folder);
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      data.append("alt_text", alt);
      try {
        const result = await uploadImageAction(data);
        if (result.ok && result.url) insertBlock(`![${alt}](${result.url})`);
        else setMessage(result.message);
      } catch {
        setMessage("Upload failed. Check your connection and try again.");
      }
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  const tool =
    "inline-flex h-8 w-8 items-center justify-center rounded text-text-primary/70 hover:bg-canvas-warm hover:text-ink-900 disabled:opacity-40";

  return (
    <div className={`mt-1 overflow-hidden rounded-card border bg-surface ${invalid ? "border-error" : "border-border"}`}>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1">
        <div className="mr-2 flex rounded border border-border text-xs">
          {(["write", "preview"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={`px-2.5 py-1 capitalize ${tab === entry ? "bg-ink-900 text-text-inverse" : "text-ink-900"}`}
            >
              {entry}
            </button>
          ))}
        </div>
        <button type="button" className={tool} onClick={() => insert("## ", "", "Heading")} disabled={tab === "preview"} aria-label="Heading">
          <Heading2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert("**", "**", "bold text")} disabled={tab === "preview"} aria-label="Bold">
          <Bold aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert("*", "*", "italic text")} disabled={tab === "preview"} aria-label="Italic">
          <Italic aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert("[", "](https://)", "link text")} disabled={tab === "preview"} aria-label="Link">
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert("- ", "", "List item")} disabled={tab === "preview"} aria-label="Bulleted list">
          <List aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert("> ", "", "Quote")} disabled={tab === "preview"} aria-label="Quote">
          <Quote aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy || tab === "preview"}
          className="ml-auto inline-flex items-center gap-1.5 rounded-card bg-brand-700 px-3 py-1 text-xs font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
        >
          {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />}
          {busy ? "Uploading..." : "Insert image"}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(event) => uploadImages(event.target.files)}
        />
      </div>

      {tab === "write" ? (
        <textarea
          ref={area}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onDrop={(event) => {
            if (event.dataTransfer.files?.length) {
              event.preventDefault();
              uploadImages(event.dataTransfer.files);
            }
          }}
          onPaste={(event) => {
            const files = event.clipboardData.files;
            if (files?.length) {
              event.preventDefault();
              uploadImages(files);
            }
          }}
          rows={18}
          aria-describedby={describedBy}
          aria-label="Content"
          className="block w-full resize-y border-0 bg-surface px-3 py-2 font-mono text-[13px] leading-6 focus:outline-none"
        />
      ) : (
        <div className="max-h-[32rem] min-h-[18rem] overflow-y-auto px-5 py-4">
          {value.trim() ? <Markdown source={value} /> : <p className="text-sm text-text-primary/50">Nothing to preview yet.</p>}
        </div>
      )}
      <p className="border-t border-border px-3 py-1.5 text-xs text-text-primary/60">
        {message ? <span className="text-error">{message}</span> : "Drag, paste or insert images anywhere in the post. Markdown: ## heading, **bold**, - list, > quote."}
      </p>
    </div>
  );
}
