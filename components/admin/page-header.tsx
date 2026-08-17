import Link from "next/link";

export default function PageHeader({
  stamp,
  title,
  description,
  action,
}: {
  stamp: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="section-stamp mb-1">{stamp}</p>
        <h1 className="font-display text-2xl font-semibold text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-primary/70">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
