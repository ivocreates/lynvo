import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { getStudioUrl, getTechUrl } from "@/lib/env";
import { SITE_COPY_GROUPS } from "@/lib/admin/settings";
import PageHeader from "@/components/admin/page-header";
import BillingSettingsForm from "@/components/admin/billing-settings-form";
import { saveSiteCopy } from "./actions";

export default async function SitesPage() {
  await requirePermission("website");

  const supabase = createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const values: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: { text?: string } | null }[]) values[row.key] = row.value?.text ?? "";

  return (
    <div>
      <PageHeader
        stamp="WEBSITES"
        title="Site copy"
        description="Headlines and calls to action for lynvo.studio and lynvo.tech, managed from one place."
      />

      <div className="mb-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        <a href={getStudioUrl()} target="_blank" rel="noreferrer" className="archive-card block p-5">
          <p className="section-stamp">LYNVO.STUDIO</p>
          <p className="mt-2 text-sm text-text-primary/75">Websites, brand identity, online presence and growth with AI.</p>
        </a>
        <a href={getTechUrl()} target="_blank" rel="noreferrer" className="archive-card block p-5">
          <p className="section-stamp">LYNVO.TECH</p>
          <p className="mt-2 text-sm text-text-primary/75">Custom software for small businesses and cybersecurity.</p>
        </a>
      </div>

      <div className="mb-8 max-w-2xl rounded-card border border-border bg-surface p-5 text-sm text-text-primary/80">
        <p className="font-medium text-ink-900">Which site shows what?</p>
        <p className="mt-1">
          Every service, portfolio project, blog post and FAQ has a <span className="font-medium">Site</span> field: lynvo.studio,
          lynvo.tech or both. Edit them under{" "}
          <Link href="/admin/services" className="text-brand-700 underline">Services</Link>,{" "}
          <Link href="/admin/projects" className="text-brand-700 underline">Work</Link>,{" "}
          <Link href="/admin/blog" className="text-brand-700 underline">Blog</Link> and{" "}
          <Link href="/admin/faqs" className="text-brand-700 underline">FAQs</Link>.
        </p>
      </div>

      <BillingSettingsForm values={values} groups={SITE_COPY_GROUPS} action={saveSiteCopy} submitLabel="Save site copy" />
    </div>
  );
}
