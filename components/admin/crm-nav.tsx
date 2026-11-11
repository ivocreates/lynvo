import Link from "next/link";

const LINKS = [
  { key: "pipeline", href: "/admin/crm", label: "Pipeline" },
  { key: "leads", href: "/admin/crm/leads", label: "Leads & calls" },
  { key: "playbook", href: "/admin/crm/playbook", label: "Playbook & scripts" },
  { key: "enquiries", href: "/admin/contacts", label: "Website enquiries" },
] as const;

export default function CrmNav({ active }: { active: (typeof LINKS)[number]["key"] }) {
  return (
    <nav aria-label="Sales" className="mb-6 flex flex-wrap gap-2 border-b border-border">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            link.key === active ? "border-brand-700 text-ink-900" : "border-transparent text-text-primary/60 hover:text-ink-900"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
