import { requireTeamMember } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Directory" };

export default async function StaffDirectoryPage() {
  await requireTeamMember();

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, title, department, employment_type, phone")
    .eq("is_active", true)
    .order("role", { ascending: false });

  const people = (data ?? []) as Record<string, any>[];

  return (
    <div>
      <p className="section-stamp">TEAM</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Directory</h1>
      <p className="mt-2 text-sm text-text-primary/75">Everyone currently active at LYNVO.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <div key={person.id} className="rounded-card border border-border bg-surface p-5">
            <p className="font-display text-lg font-semibold text-ink-900">
              {person.display_name ?? person.email}
            </p>
            <p className="section-stamp mt-1">{ROLE_LABELS[person.role as Role] ?? person.role}</p>
            {person.title && <p className="mt-2 text-sm text-text-primary/80">{person.title}</p>}
            {person.department && (
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-brand-700">{person.department}</p>
            )}
            <a
              href={`mailto:${person.email}`}
              className="mt-3 block break-all text-sm text-brand-700 underline underline-offset-4"
            >
              {person.email}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
