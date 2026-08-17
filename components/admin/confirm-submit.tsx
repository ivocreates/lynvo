"use client";

export default function ConfirmSubmit({
  message,
  label = "Delete",
  className = "text-sm text-error underline hover:opacity-80",
}: {
  message: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
