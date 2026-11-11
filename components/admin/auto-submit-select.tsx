"use client";

/** A select that submits its form as soon as the value changes. */
export default function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  label,
  className = "rounded-card border border-border bg-surface px-2 py-1 text-xs focus:border-brand-700 focus:outline-none",
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      aria-label={label}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
