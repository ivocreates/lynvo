import { STATUS_LABELS, STATUS_TONES } from "@/lib/admin/billing";

export default function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-card border px-2 py-0.5 text-xs font-medium ${
        STATUS_TONES[status] ?? "border-border bg-canvas-warm text-text-primary/70"
      } ${className}`}
    >
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}
