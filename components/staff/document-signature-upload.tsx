"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocumentSignature } from "@/app/staff/documents/actions";

const PAD_WIDTH = 480;
const PAD_HEIGHT = 160;

export default function DocumentSignatureUpload({ documentId }: { documentId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [mode, setMode] = useState<"upload" | "draw">("draw");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(file: File) {
    setMessage(null);
    const formData = new FormData();
    formData.append("id", documentId);
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDocumentSignature(formData);
      setMessage(result.message);
    });
  }

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#1a1a1a";
    return context;
  }

  function pointFromEvent(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = pointFromEvent(canvas, event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context || !drawingRef.current) return;
    const { x, y } = pointFromEvent(canvas, event);
    context.lineTo(x, y);
    context.stroke();
    hasDrawnRef.current = true;
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) return;
    context.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
    hasDrawnRef.current = false;
  }

  function saveDrawnSignature() {
    if (!hasDrawnRef.current) {
      setMessage("Draw your signature first.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      submit(new File([blob], "signature.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-sm font-medium text-ink-900">Signature required before download</p>
      <p className="mt-1 text-xs leading-5 text-text-primary/60">
        Draw your signature below or upload a PNG image of it.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`rounded-card border px-3 py-1.5 text-xs ${
            mode === "draw" ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-canvas-warm"
          }`}
        >
          Draw signature
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-card border px-3 py-1.5 text-xs ${
            mode === "upload" ? "border-brand-700 bg-brand-700 text-text-inverse" : "border-border hover:bg-canvas-warm"
          }`}
        >
          Upload PNG
        </button>
      </div>

      {mode === "draw" ? (
        <div className="mt-3">
          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="max-w-full touch-none rounded-card border border-border bg-white"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={saveDrawnSignature}
              disabled={pending}
              className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save signature"}
            </button>
            <button
              type="button"
              onClick={clearPad}
              disabled={pending}
              className="rounded-card border border-border px-4 py-2 text-sm hover:bg-canvas-warm disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) submit(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
          >
            {pending ? "Uploading..." : "Upload PNG signature"}
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-text-primary/70">{message}</p>}
    </div>
  );
}