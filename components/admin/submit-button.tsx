"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children = "Save",
  pendingLabel = "Saving...",
  variant = "primary",
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "danger" | "ghost";
}) {
  const { pending } = useFormStatus();

  const styles = {
    primary: "bg-brand-700 text-text-inverse hover:bg-ink-900",
    danger: "bg-error text-text-inverse hover:opacity-90",
    ghost: "border border-border text-ink-900 hover:bg-canvas-warm",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-card px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
