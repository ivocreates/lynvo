"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  PenLine,
  RotateCw,
  Scissors,
  Stamp,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import LetterSheet, { PlacedImage } from "@/components/letters/letter-sheet";
import SubmitButton from "@/components/admin/submit-button";
import type { BillingSettings } from "@/lib/admin/billing";
import {
  LETTER_PLACEHOLDERS,
  PX_PER_MM,
  SHEET,
  type Letter,
  type LetterAsset,
  type Placement,
  type PlacementKind,
} from "@/lib/letters";
import { uploadLetterAsset } from "@/app/admin/(dashboard)/letters/actions";

const FIELD =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2.5 text-base focus:border-brand-700 focus:outline-none sm:text-sm";
const LABEL = "block text-xs font-medium uppercase tracking-[0.14em] text-text-primary/60";
const SHEET_PX = SHEET.widthMm * PX_PER_MM;
/** On paper, page 1 holds 281mm (bottom margin 16mm); later pages hold 267mm (14mm top, 16mm bottom). */
const FIRST_PAGE_MM = SHEET.heightMm - SHEET.padBottomMm;
const NEXT_PAGE_MM = SHEET.heightMm - 14 - SHEET.padBottomMm;

type Drag = {
  id: string;
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
  startW: number;
  /** Area offset (mm) of the placement's anchor when the drag began. */
  originX: number;
  originY: number;
};

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function LetterEditor({
  letter,
  settings,
  assets,
  action,
}: {
  letter: Letter;
  settings: BillingSettings;
  assets: LetterAsset[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(letter.title);
  const [reference, setReference] = useState(letter.reference ?? "");
  const [letterDate, setLetterDate] = useState(letter.letter_date);
  const [recipient, setRecipient] = useState(letter.recipient ?? "");
  const [subject, setSubject] = useState(letter.subject ?? "");
  const [body, setBody] = useState(letter.body);
  const [showLetterhead, setShowLetterhead] = useState(letter.show_letterhead);
  const [status, setStatus] = useState(letter.status);
  const [placements, setPlacements] = useState<Placement[]>(letter.placements);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"write" | "sign">("write");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [extraAssets, setExtraAssets] = useState<LetterAsset[]>([]);
  const [dirty, setDirty] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(SHEET.heightMm * PX_PER_MM);

  // Fit the A4 sheet to the available width; positions are always stored in real millimetres.
  useEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, frame.clientWidth / SHEET_PX));
      setSheetHeight(sheet.offsetHeight);
    });
    observer.observe(frame);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setDirty(true);
  };

  const allAssets = useMemo(() => {
    const seen = new Set(assets.map((asset) => asset.src));
    const fromLetter: LetterAsset[] = [];
    for (const placement of [...placements]) {
      if (seen.has(placement.src)) continue;
      seen.add(placement.src);
      fromLetter.push({ key: placement.src, kind: placement.kind, label: placement.kind === "stamp" ? "Uploaded stamp" : "Uploaded signature", src: placement.src, width: placement.w });
    }
    return [...assets, ...extraAssets.filter((asset) => !assets.some((known) => known.src === asset.src)), ...fromLetter.filter((asset) => !extraAssets.some((extra) => extra.src === asset.src))];
  }, [assets, extraAssets, placements]);

  // ---------------------------------------------------------------- geometry

  const toMm = (px: number) => px / scale / PX_PER_MM;

  /** Signature areas in sheet millimetres. */
  const areas = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return [] as { left: number; top: number; right: number; bottom: number }[];
    const origin = sheet.getBoundingClientRect();
    return Array.from(sheet.querySelectorAll<HTMLElement>("[data-signoff]")).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: (rect.left - origin.left) / scale / PX_PER_MM,
        top: (rect.top - origin.top) / scale / PX_PER_MM,
        right: (rect.right - origin.left) / scale / PX_PER_MM,
        bottom: (rect.bottom - origin.top) / scale / PX_PER_MM,
      };
    });
  }, [scale]);

  const areaOrigin = useCallback(
    (anchor: number | null) => {
      if (anchor === null) return { x: 0, y: 0 };
      const list = areas();
      const area = list[Math.min(anchor, list.length - 1)];
      return area ? { x: area.left, y: area.top } : { x: SHEET.padXMm, y: 150 };
    },
    [areas]
  );

  /** Attach to a signature area when the image sits on (or near) one; otherwise fix it on the page. */
  const resolveAnchor = useCallback(
    (absX: number, absY: number, w: number, h: number) => {
      const centerX = absX + w / 2;
      const centerY = absY + h / 2;
      const list = areas();
      const index = list.findIndex(
        (area) => centerY >= area.top - 14 && centerY <= area.bottom + 14 && centerX >= area.left - 20 && centerX <= area.right + 20
      );
      if (index === -1) return { anchor: null, x: absX, y: absY };
      return { anchor: index, x: absX - list[index].left, y: absY - list[index].top };
    },
    [areas]
  );

  const sheetPoint = (clientX: number, clientY: number) => {
    const origin = sheetRef.current!.getBoundingClientRect();
    return { x: toMm(clientX - origin.left), y: toMm(clientY - origin.top) };
  };

  const heightOf = (id: string, w: number) => {
    const element = sheetRef.current?.querySelector<HTMLElement>(`[data-placement="${id}"]`);
    return element ? element.offsetHeight / PX_PER_MM : w * 0.45;
  };

  // ---------------------------------------------------------------- placing

  function addPlacement(asset: { kind: PlacementKind; src: string; width: number }, at?: { x: number; y: number }) {
    const id = newId();
    let placement: Placement;
    if (at) {
      const h = asset.width * 0.45;
      const absX = at.x - asset.width / 2;
      const absY = at.y - h / 2;
      placement = { id, kind: asset.kind, src: asset.src, w: asset.width, rotate: 0, ...resolveAnchor(absX, absY, asset.width, h) };
    } else {
      // Tap to add: signatures go in the first signature area; stamps are pressed over the signature.
      const inArea = placements.filter((entry) => entry.anchor === 0);
      const signatures = inArea.filter((entry) => entry.kind !== "stamp");
      if (asset.kind === "stamp") {
        const target = signatures[signatures.length - 1];
        placement = target
          ? { id, kind: "stamp", src: asset.src, w: asset.width, rotate: -6, anchor: 0, x: target.x + target.w * 0.5, y: target.y - 6 }
          : { id, kind: "stamp", src: asset.src, w: asset.width, rotate: -6, anchor: 0, x: 30, y: -4 };
      } else {
        const last = signatures[signatures.length - 1];
        placement = { id, kind: asset.kind, src: asset.src, w: asset.width, rotate: 0, anchor: 0, x: last ? last.x + last.w + 20 : 0, y: 1 };
      }
    }
    setPlacements((current) => [...current, placement]);
    setSelected(id);
    setDirty(true);
    setTab("sign");
  }

  function update(id: string, changes: Partial<Placement>) {
    setPlacements((current) => current.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
    setDirty(true);
  }

  function remove(id: string) {
    setPlacements((current) => current.filter((entry) => entry.id !== id));
    setSelected((current) => (current === id ? null : current));
    setDirty(true);
  }

  async function upload(file: File, at?: { x: number; y: number }) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("Use a PNG (ideally with a transparent background), JPG or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage("That image is over 3 MB. Crop or compress it first.");
      return;
    }
    setUploading(true);
    setMessage("");
    const data = new FormData();
    data.append("file", file);
    try {
      const result = await uploadLetterAsset(data);
      if (!result.ok || !result.url) {
        setMessage(result.message);
        return;
      }
      const kind: PlacementKind = /stamp|seal/i.test(file.name) ? "stamp" : "signature";
      const asset: LetterAsset = { key: result.url, kind, label: kind === "stamp" ? "Uploaded stamp" : "Uploaded signature", src: result.url, width: kind === "stamp" ? 32 : 45 };
      setExtraAssets((current) => [...current, asset]);
      addPlacement(asset, at);
    } catch {
      setMessage("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ---------------------------------------------------------------- drag & drop from the palette / desktop

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes("Files") || event.dataTransfer.types.includes("text/x-letter-asset")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const at = sheetPoint(event.clientX, event.clientY);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      upload(file, at);
      return;
    }
    const key = event.dataTransfer.getData("text/x-letter-asset");
    const asset = allAssets.find((entry) => entry.key === key);
    if (asset) addPlacement(asset, at);
  }

  // ---------------------------------------------------------------- moving and resizing (mouse, pen and touch)

  function startDrag(event: ReactPointerEvent<HTMLElement>, placement: Placement, mode: Drag["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const origin = areaOrigin(placement.anchor);
    drag.current = {
      id: placement.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: placement.x,
      startY: placement.y,
      startW: placement.w,
      originX: origin.x,
      originY: origin.y,
    };
    setSelected(placement.id);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = toMm(event.clientX - state.pointerX);
    const dy = toMm(event.clientY - state.pointerY);
    if (state.mode === "resize") update(state.id, { w: Math.min(190, Math.max(8, Math.round((state.startW + dx) * 10) / 10)) });
    else update(state.id, { x: Math.round((state.startX + dx) * 10) / 10, y: Math.round((state.startY + dy) * 10) / 10 });
  }

  function endDrag() {
    const state = drag.current;
    drag.current = null;
    if (!state || state.mode !== "move") return;
    // Re-attach: dragged onto a signature area it follows the text; elsewhere it stays put on the page.
    setPlacements((current) =>
      current.map((entry) => {
        if (entry.id !== state.id) return entry;
        const absX = state.originX + entry.x;
        const absY = state.originY + entry.y;
        return { ...entry, ...resolveAnchor(absX, absY, entry.w, heightOf(entry.id, entry.w)) };
      })
    );
  }

  function onKey(event: React.KeyboardEvent<HTMLElement>, placement: Placement) {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, Partial<Placement>> = {
      ArrowLeft: { x: placement.x - step },
      ArrowRight: { x: placement.x + step },
      ArrowUp: { y: placement.y - step },
      ArrowDown: { y: placement.y + step },
    };
    if (moves[event.key]) {
      event.preventDefault();
      update(placement.id, moves[event.key]);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(placement.id);
    } else if (event.key === "Escape") setSelected(null);
  }

  const renderPlacement = (placement: Placement) => {
    const active = selected === placement.id;
    return (
      <PlacedImage
        key={placement.id}
        placement={placement}
        role="button"
        tabIndex={0}
        aria-label={`${placement.kind === "stamp" ? "Stamp" : "Signature"}: drag to move, arrow keys to nudge, Delete to remove`}
        onPointerDown={(event) => startDrag(event, placement, "move")}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => onKey(event, placement)}
        onFocus={() => setSelected(placement.id)}
        className="cursor-move touch-none outline-none"
      >
          <span
            aria-hidden
            className={`absolute -inset-[1.5mm] cursor-move touch-none rounded-sm border-2 ${
              active ? "border-brand-700 bg-brand-700/5" : "border-dashed border-transparent hover:border-brand-500/60"
            }`}
            style={{ mixBlendMode: "normal" }}
          />
          {active && (
            <span
              aria-hidden
              onPointerDown={(event) => startDrag(event, placement, "resize")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute -bottom-[4mm] -right-[4mm] h-[7mm] w-[7mm] cursor-nwse-resize touch-none rounded-full border-2 border-white bg-brand-700 shadow"
            />
          )}
      </PlacedImage>
    );
  };

  // ---------------------------------------------------------------- body toolbar

  function insert(before: string, after = "", placeholder = "") {
    const element = bodyRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const chosen = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + before + chosen + after + body.slice(end));
    setDirty(true);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + chosen.length);
    });
  }

  function insertBlock(text: string) {
    const element = bodyRef.current;
    const position = element?.selectionStart ?? body.length;
    const prefix = position > 0 && body[position - 1] !== "\n" ? "\n\n" : position > 0 && body[position - 2] !== "\n" ? "\n" : "";
    setBody(`${body.slice(0, position)}${prefix}${text}\n\n${body.slice(position)}`);
    setDirty(true);
  }

  const pageGuides: number[] = [];
  for (let mm = FIRST_PAGE_MM; mm < sheetHeight / PX_PER_MM - 4; mm += NEXT_PAGE_MM) pageGuides.push(mm);

  const current = placements.find((entry) => entry.id === selected) ?? null;
  const tool =
    "inline-flex h-9 w-9 items-center justify-center rounded text-text-primary/70 hover:bg-canvas-warm hover:text-ink-900";

  return (
    <form action={action} onSubmit={() => setDirty(false)} className="pb-24 lg:pb-0">
      <input type="hidden" name="id" value={letter.id} />
      <input type="hidden" name="placements" value={JSON.stringify(placements)} />
      <input type="hidden" name="show_letterhead" value={showLetterhead ? "1" : "0"} />
      <input type="hidden" name="next" ref={nextRef} defaultValue="" />

      {/* Phone: one panel at a time. Desktop: side by side. */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 flex border-b border-border bg-canvas-warm/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:top-0 lg:hidden">
        {(
          [
            ["write", "1 · Write"],
            ["sign", "2 · Sign & preview"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px flex-1 border-b-2 py-3 text-sm font-medium ${tab === key ? "border-brand-700 text-ink-900" : "border-transparent text-text-primary/60"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ------------------------------------------------ write */}
        <div className={`space-y-4 ${tab === "write" ? "" : "hidden lg:block"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className={LABEL}>
                Letter name (for your list)
              </label>
              <input id="title" name="title" required value={title} onChange={(event) => touch(setTitle)(event.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="letter_date" className={LABEL}>
                Date
              </label>
              <input id="letter_date" name="letter_date" type="date" required value={letterDate} onChange={(event) => touch(setLetterDate)(event.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="reference" className={LABEL}>
                Reference
              </label>
              <input
                id="reference"
                name="reference"
                value={reference}
                onChange={(event) => touch(setReference)(event.target.value)}
                placeholder="Auto-numbered when blank"
                className={FIELD}
              />
            </div>
          </div>

          <div>
            <label htmlFor="recipient" className={LABEL}>
              To (name and address)
            </label>
            <textarea id="recipient" name="recipient" rows={4} value={recipient} onChange={(event) => touch(setRecipient)(event.target.value)} className={FIELD} />
          </div>

          <div>
            <label htmlFor="subject" className={LABEL}>
              Subject
            </label>
            <input id="subject" name="subject" value={subject} onChange={(event) => touch(setSubject)(event.target.value)} className={FIELD} />
          </div>

          <div>
            <label htmlFor="body" className={LABEL}>
              Letter (Markdown)
            </label>
            <div className="mt-1 overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
                <button type="button" className={tool} onClick={() => insert("**", "**", "bold text")} aria-label="Bold" title="Bold">
                  <Bold aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className={tool} onClick={() => insert("*", "*", "italic text")} aria-label="Italic" title="Italic">
                  <Italic aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className={tool} onClick={() => insertBlock("## Heading")} aria-label="Heading" title="Heading">
                  <Heading2 aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className={tool} onClick={() => insertBlock("- First point\n- Second point")} aria-label="Bulleted list" title="Bulleted list">
                  <List aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className={tool} onClick={() => insertBlock("1. First\n2. Second")} aria-label="Numbered list" title="Numbered list">
                  <ListOrdered aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={tool}
                  onClick={() => insertBlock("| Item | Details |\n| --- | --- |\n| | |")}
                  aria-label="Table"
                  title="Table"
                >
                  <Table2 aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={tool}
                  onClick={() => insertBlock("Yours faithfully,\nFor **{{company}}**\n\n[[signature]]\n\n**{{signatory}}**\n{{signatory_title}}")}
                  aria-label="Sign-off with signature area"
                  title="Sign-off with signature area"
                >
                  <PenLine aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" className={tool} onClick={() => insertBlock("[[page]]")} aria-label="Page break" title="Page break">
                  <Scissors aria-hidden className="h-4 w-4" />
                </button>
                <select
                  aria-label="Insert a company detail"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) insert(event.target.value);
                  }}
                  className="ml-auto max-w-[9.5rem] rounded border border-border bg-surface px-2 py-1.5 text-xs"
                >
                  <option value="">Insert detail…</option>
                  {LETTER_PLACEHOLDERS.map((entry) => (
                    <option key={entry.token} value={entry.token}>
                      {entry.help}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                ref={bodyRef}
                id="body"
                name="body"
                rows={18}
                value={body}
                onChange={(event) => touch(setBody)(event.target.value)}
                className="block w-full resize-y border-0 bg-surface px-3 py-2 font-mono text-[14px] leading-6 focus:outline-none sm:text-[13px]"
              />
            </div>
            <p className="mt-1.5 text-xs leading-5 text-text-primary/60">
              <code>**bold**</code> · <code>*italic*</code> · <code>## heading</code> · <code>- list</code> · <code>| table |</code> ·{" "}
              <code>[[signature]]</code> reserves room for the signature and stamp · <code>[[page]]</code> starts a new page ·{" "}
              <code>{"{{company}}"}</code> fills in company details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-border bg-surface p-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showLetterhead} onChange={(event) => touch(setShowLetterhead)(event.target.checked)} className="h-4 w-4" />
              Print the letterhead
              <span className="text-xs text-text-primary/60">(untick for pre-printed paper)</span>
            </label>
            <label className="flex items-center gap-2">
              Status
              <select name="status" value={status} onChange={(event) => touch(setStatus)(event.target.value as Letter["status"])} className="rounded-card border border-border bg-surface px-2 py-1.5">
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setTab("sign")}
            className="w-full rounded-card border border-brand-700 px-4 py-3 text-sm font-medium text-brand-700 lg:hidden"
          >
            Next: add signature &amp; stamp →
          </button>
        </div>

        {/* ------------------------------------------------ sign & preview */}
        <div className={`min-w-0 ${tab === "sign" ? "" : "hidden lg:block"}`}>
          <div className="mb-3 rounded-card border border-border bg-surface p-3 lg:sticky lg:top-4 lg:z-10">
            <p className="text-xs text-text-primary/70">
              <span className="hidden sm:inline">Drag onto the letter, or tap to place.</span>
              <span className="sm:hidden">Tap to place, then drag on the letter.</span> Stamps always sit on top of signatures.
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {allAssets.map((asset) => (
                <button
                  key={asset.key}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/x-letter-asset", asset.key);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addPlacement(asset)}
                  className="flex shrink-0 items-center gap-2 rounded-card border border-border bg-white px-2 py-1.5 text-left text-xs hover:border-brand-700"
                  title={`Add ${asset.label}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.src} alt="" className="h-9 w-14 object-contain" draggable={false} />
                  <span className="max-w-[7.5rem] leading-tight">
                    {asset.kind === "stamp" ? <Stamp aria-hidden className="mr-1 inline h-3 w-3" /> : <PenLine aria-hidden className="mr-1 inline h-3 w-3" />}
                    {asset.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex shrink-0 items-center gap-2 rounded-card border border-dashed border-brand-700/60 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-700/5 disabled:opacity-60"
              >
                {uploading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Upload aria-hidden className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload signature / stamp"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload(file);
                }}
              />
            </div>
            {allAssets.length === 0 && (
              <p className="mt-2 text-xs text-warning">
                No signature or stamp saved yet. Upload one here, or add them once under Settings → Documents.
              </p>
            )}
            {message && <p className="mt-2 text-xs text-error">{message}</p>}

            {current && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
                <span className="font-medium text-ink-900">
                  {current.kind === "stamp" ? "Stamp" : "Signature"} · {current.anchor === null ? "fixed on page" : "moves with the text"}
                </span>
                <label className="flex items-center gap-2">
                  Size
                  <input
                    type="range"
                    min={10}
                    max={120}
                    value={current.w}
                    onChange={(event) => update(current.id, { w: Number(event.target.value) })}
                    className="w-24"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <RotateCw aria-hidden className="h-3.5 w-3.5" />
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    value={current.rotate}
                    onChange={(event) => update(current.id, { rotate: Number(event.target.value) })}
                    className="w-20"
                    aria-label="Rotate"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Layer
                  <select
                    value={current.kind === "stamp" ? "stamp" : "signature"}
                    onChange={(event) => update(current.id, { kind: event.target.value as PlacementKind })}
                    className="rounded border border-border bg-surface px-1.5 py-1"
                  >
                    <option value="signature">Signature (below)</option>
                    <option value="stamp">Stamp (on top)</option>
                  </select>
                </label>
                <button type="button" onClick={() => remove(current.id)} className="ml-auto inline-flex items-center gap-1 text-error">
                  <Trash2 aria-hidden className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            )}
          </div>

          <div ref={frameRef} className="w-full select-none" onPointerDown={(event) => event.target === event.currentTarget && setSelected(null)}>
            <div className="relative mx-auto" style={{ width: SHEET_PX * scale, height: sheetHeight * scale }}>
              <div
                ref={sheetRef}
                className="absolute left-0 top-0 origin-top-left shadow-md ring-1 ring-border"
                style={{ width: SHEET_PX, transform: `scale(${scale})` }}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onPointerDown={(event) => {
                  if (!(event.target as HTMLElement).closest("[data-placement]")) setSelected(null);
                }}
              >
                <LetterSheet
                  letter={{ title, reference, letter_date: letterDate, recipient, subject, body, show_letterhead: showLetterhead }}
                  settings={settings}
                  placements={placements}
                  renderPlacement={renderPlacement}
                  overlay={pageGuides.map((mm, index) => (
                    <div
                      key={mm}
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-clay-500/70"
                      style={{ top: `${mm}mm` }}
                    >
                      <span className="absolute right-[2mm] -translate-y-full bg-white px-1 text-[8pt] text-clay-500">page {index + 2} ↓</span>
                    </div>
                  ))}
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-text-primary/60">
            Drop a PNG of a signature or stamp straight onto the page to upload it. Arrow keys nudge the selected image.
          </p>
        </div>
      </div>

      {/* Save bar: pinned to the bottom on phones. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur lg:static lg:mt-6 lg:justify-end lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex-1 lg:flex-none [&>button]:w-full" onClickCapture={() => nextRef.current && (nextRef.current.value = "")}>
          <SubmitButton variant="ghost" pendingLabel="Saving…">
            {dirty ? "Save changes" : "Save"}
          </SubmitButton>
        </div>
        <button
          type="submit"
          onClick={() => nextRef.current && (nextRef.current.value = "print")}
          className="flex-1 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 lg:flex-none"
        >
          Save &amp; download PDF
        </button>
      </div>
    </form>
  );
}
