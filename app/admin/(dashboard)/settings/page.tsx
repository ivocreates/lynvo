import Link from "next/link";
import { createClient } from "@/lib/db/server";
import { requireAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";
import SettingsForm from "@/components/admin/settings-form";

export default async function SettingsPage() {
  await requireAdmin();

  const db = createClient();
  const { data: rows } = await db.from("site_settings").select("key, value");

  const values: Record<string, string> = {};
  for (const row of (rows ?? []) as { key: string; value: { text?: string } | null }[]) {
    values[row.key] = row.value?.text ?? "";
  }

  return (
    <div>
      <PageHeader
        stamp="CONFIGURATION"
        title="Site settings"
        description="Identity and contact details used across the public site."
      />
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/admin/access", title: "Access & permissions", text: "Choose who can use Letters, CRM, billing, accounts and the websites, by role or per person." },
          { href: "/admin/admins", title: "People & team page", text: "Invite people, set roles, and choose who appears on the public team page." },
          { href: "/admin/documents/settings", title: "Signatures, stamp & letters", text: "Partner signatures, company stamp, letter numbering and footer." },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="rounded-card border border-border bg-surface p-4 hover:border-brand-700">
            <span className="font-medium text-ink-900">{card.title} →</span>
            <span className="mt-1 block text-xs leading-5 text-text-primary/65">{card.text}</span>
          </Link>
        ))}
      </section>
      <SettingsForm values={values} />
    </div>
  );
}
