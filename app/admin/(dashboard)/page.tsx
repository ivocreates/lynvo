import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, hasRole } from "@/lib/auth";
import PageHeader from "@/components/admin/page-header";

async function count(table: string, filter?: (query: any) => any) {
  const supabase = createClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count: total } = await query;
  return total ?? 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const profile = await requireStaff();
  const isAdmin = hasRole(profile, "admin");

  const [projects, published, services, posts, drafts, team, pendingReviews, newContacts] =
    await Promise.all([
      count("projects"),
      count("projects", (q) => q.eq("status", "published")),
      count("services", (q) => q.eq("active", true)),
      count("blog_posts"),
      count("blog_posts", (q) => q.eq("status", "draft")),
      count("team_members", (q) => q.eq("is_active", true)),
      count("reviews", (q) => q.eq("status", "pending")),
      isAdmin ? count("contacts", (q) => q.eq("status", "new")) : Promise.resolve(0),
    ]);

  const supabase = createClient();
  const { data: recent } = await supabase
    .from("audit_logs")
    .select("action, entity, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const metrics = [
    { label: "Projects", value: projects, detail: `${published} published`, href: "/admin/projects" },
    { label: "Services", value: services, detail: "active", href: "/admin/services" },
    { label: "Blog posts", value: posts, detail: `${drafts} draft`, href: "/admin/blog" },
    { label: "Team", value: team, detail: "active", href: "/admin/team" },
    { label: "Pending reviews", value: pendingReviews, detail: "awaiting moderation", href: "/admin/reviews" },
    ...(isAdmin
      ? [{ label: "New enquiries", value: newContacts, detail: "unread", href: "/admin/contacts" }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        stamp="ADMIN DASHBOARD"
        title={`Welcome, ${profile.display_name ?? profile.email}`}
        description="Manage content, media and enquiries for the LYNVO site."
      />

      {searchParams.denied && (
        <p className="mb-6 rounded-card border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          You do not have permission to open that section.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="archive-card block p-5">
            <p className="section-stamp">{metric.label.toUpperCase()}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-ink-900">{metric.value}</p>
            <p className="mt-1 text-xs text-text-primary/60">{metric.detail}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink-900">Recent activity</h2>
        {recent && recent.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {recent.map((entry: Record<string, any>, index: number) => (
              <li key={index} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-text-primary/85">
                  <span className="font-mono text-xs uppercase text-brand-700">{entry.action}</span>{" "}
                  {entry.entity}
                  {entry.metadata?.title ? ` — ${entry.metadata.title}` : ""}
                </span>
                <span className="text-xs text-text-primary/50">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-primary/60">No recorded activity yet.</p>
        )}
      </section>
    </div>
  );
}
