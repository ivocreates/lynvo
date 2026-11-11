import Link from "next/link";
import { fyLabel } from "@/lib/accounts";

const TABS = [
  { key: "overview", href: "/admin/accounts", label: "Overview & tax" },
  { key: "ledger", href: "/admin/accounts/ledger", label: "Income & expenses" },
  { key: "compliance", href: "/admin/accounts/compliance", label: "Compliance calendar" },
] as const;

export default function AccountsNav({ active, fy, years }: { active: (typeof TABS)[number]["key"]; fy: number; years: number[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border">
      <nav aria-label="Accounts" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`${tab.href}?fy=${fy}`}
            aria-current={tab.key === active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab.key === active ? "border-brand-700 text-ink-900" : "border-transparent text-text-primary/60 hover:text-ink-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mb-2 flex flex-wrap gap-1">
        {years.map((year) => (
          <Link
            key={year}
            href={`${TABS.find((tab) => tab.key === active)!.href}?fy=${year}`}
            className={`rounded-card px-2.5 py-1 text-xs ${year === fy ? "bg-ink-900 text-text-inverse" : "border border-border text-ink-900 hover:bg-canvas-warm"}`}
          >
            {fyLabel(year)}
          </Link>
        ))}
      </div>
    </div>
  );
}
