import Link from "next/link";
import { Plus } from "lucide-react";

const LINKS = [
  { key: "today", href: "/admin/crm/today", label: "Call mode" },
  { key: "pipeline", href: "/admin/crm", label: "Pipeline" },
  { key: "leads", href: "/admin/crm/leads", label: "Leads & calls" },
  { key: "playbook", href: "/admin/crm/playbook", label: "Playbook & scripts" },
  { key: "enquiries", href: "/admin/contacts", label: "Website enquiries" },
] as const;

export default function CrmNav({
  active,
  fab = true,
}: {
  active: (typeof LINKS)[number]["key"];
  /** Floating "add lead" button on phones. Off where the page has its own bottom bar. */
  fab?: boolean;
}) {
  return (
    <>
      <nav
        aria-label="Sales"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={link.key === active ? "page" : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              link.key === active ? "border-brand-700 text-ink-900" : "border-transparent text-text-primary/60 hover:text-ink-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {fab && (
        <Link
          href="/admin/crm/leads#add"
          aria-label="Add a lead"
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-text-inverse shadow-lg active:scale-95 md:hidden"
        >
          <Plus aria-hidden className="h-6 w-6" />
        </Link>
      )}
    </>
  );
}
