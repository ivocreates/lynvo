import Link from "next/link";

const TABS = [
  { key: "overview", label: "Projects & details", suffix: "" },
  { key: "account", label: "Billing account", suffix: "/account" },
  { key: "legal", label: "Agreements", suffix: "/legal" },
] as const;

export type ClientTab = (typeof TABS)[number]["key"];

export default function ClientTabs({ clientId, active }: { clientId: string; active: ClientTab }) {
  return (
    <nav aria-label="Client sections" className="mb-8 flex flex-wrap gap-2 border-b border-border">
      {TABS.map((tab) => {
        const current = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/admin/clients/${clientId}${tab.suffix}`}
            aria-current={current ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              current ? "border-brand-700 text-ink-900" : "border-transparent text-text-primary/60 hover:text-ink-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
