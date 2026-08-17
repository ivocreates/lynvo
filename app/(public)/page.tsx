import Image from "next/image";
import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import {
  getProjects,
  getReviews,
  getServices,
  getSiteSettings,
  getSocialLinks,
  getStats,
  getTeamMembers,
} from "@/lib/queries";

const principles = [
  "End-to-end thinking",
  "Long-term vision",
  "Security first",
  "Performance obsessed",
  "Data-driven growth",
  "Global + local reach",
];

const stackGroups = [
  { label: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { label: "Backend", items: ["Node.js", "Python", "Laravel", "Firebase", "REST / GraphQL"] },
  { label: "Security", items: ["VAPT", "OWASP Top 10", "Burp Suite", "Cisco CCST"] },
  { label: "Tools", items: ["Git", "Docker", "Stripe", "Resend", "Sentry"] },
];

function settingsObject(rows: { key: string; value: { text?: string } | null }[]) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value?.text ?? ""])) as Record<string, string>;
}

export default async function HomePage() {
  const [services, projects, stats, team, reviews, settingsRows, socialLinks] = await Promise.all([
    getServices(),
    getProjects(),
    getStats(),
    getTeamMembers(),
    getReviews(),
    getSiteSettings(),
    getSocialLinks(),
  ]);

  const settings = settingsObject(settingsRows);
  const featuredServices = services.filter((service) => service.featured).slice(0, 6);
  const featuredProjects = projects.filter((project) => project.featured).slice(0, 4);
  const featuredReview = reviews[0];
  const founder = team[0];
  const heroKicker = settings.hero_kicker || "LYNVO DIGITAL STUDIO / LINKING IDEAS TO INNOVATION";
  const heroHeadline = settings.hero_headline || "We turn bold ideas into digital momentum. Built to scale.";
  const heroDescription =
    settings.hero_description ||
    "From launch-ready websites to product-grade applications, we blend design strategy, engineering discipline, and business context so every release moves your brand forward.";
  const heroPrimary = settings.hero_primary_cta || "Start a project";
  const heroSecondary = settings.hero_secondary_cta || "See case studies";

  return (
    <div>
      <section className="container-page grid gap-10 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-24">
        <div>
          <SectionStamp label={heroKicker} />
          <h1 className="max-w-3xl font-display text-4xl font-semibold text-ink-900 sm:text-5xl lg:text-6xl">
            {heroHeadline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-text-primary/80">{heroDescription}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900"
            >
              {heroPrimary}
            </Link>
            <Link
              href="/archive"
              className="rounded-card border border-border px-5 py-3 text-sm font-medium text-ink-900 hover:bg-surface"
            >
              {heroSecondary}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-brand-700">
            <span>Design-led engineering</span>
            <span>SEO-aware architecture</span>
            <span>Launch support and growth</span>
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <p className="section-stamp">Studio log</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-card border border-border bg-canvas-warm p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-700">Who we are</p>
              <p className="mt-3 text-sm leading-6 text-text-primary/80">
                A digital partner that builds, redesigns, troubleshoots, and ships for brands that want real momentum.
              </p>
            </div>
            <div className="rounded-card border border-border bg-canvas-warm p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-700">Availability</p>
              <p className="mt-3 text-sm leading-6 text-text-primary/80">
                {settings.address || "Sawantwadi, Maharashtra, India · Available for global projects"}
              </p>
              {settings.contact_email && (
                <a className="mt-3 block text-sm underline underline-offset-4" href={`mailto:${settings.contact_email}`}>
                  {settings.contact_email}
                </a>
              )}
            </div>
            <div className="rounded-card border border-border bg-canvas-warm p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-700">Studio status</p>
              <p className="mt-3 text-sm leading-6 text-text-primary/80">
                {settings.footer_status || "Studio online"} - {settings.response_time || "We respond within 24 hours."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="border-y border-border bg-ink-900 py-14 text-text-inverse">
          <div className="container-page grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.id}>
                <p className="font-display text-4xl font-semibold">
                  {stat.value}
                  {stat.suffix}
                </p>
                <p className="section-stamp mt-2 text-text-inverse/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-16">
        <SectionStamp label="SERVICES" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-900">What we build</h2>
          <Link href="/services" className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
            View all services
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(featuredServices.length > 0 ? featuredServices : services).map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`}>
              <ArchiveCard title={service.title} meta="SERVICE" imageUrl={service.image_url}>
                <p>{service.excerpt}</p>
                {service.tags?.length ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">{service.tags.join(" / ")}</p>
                ) : null}
              </ArchiveCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionStamp label="SELECTED WORK" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Recent projects</h2>
          <Link href="/archive" className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
            Full archive
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(featuredProjects.length > 0 ? featuredProjects : projects).slice(0, 4).map((project) => {
            const content = project.content as { challenge?: string; outcome?: string; stack?: string[] } | null;

            return (
              <Link key={project.id} href={`/archive/${project.slug}`}>
                <ArchiveCard title={project.title} meta={`${project.category ?? "PROJECT"} · ${project.industry ?? "General"}`} imageUrl={project.image_url}>
                  <p>{project.excerpt}</p>
                  {content?.outcome && <p className="mt-3 text-sm font-medium text-brand-700">{content.outcome}</p>}
                  {project.tags?.length ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-primary/60">{project.tags.join(" / ")}</p>
                  ) : null}
                </ArchiveCard>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionStamp label="Lynvo Principles" />
        <h2 className="font-display text-2xl font-semibold text-ink-900">How we think</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle, index) => (
            <div key={principle} className="rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand-700">0{index + 1}</p>
              <p className="mt-3 font-display text-lg font-semibold text-ink-900">{principle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionStamp label="WORKBENCH" />
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">Technology stack</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {stackGroups.map((group) => (
                <div key={group.label} className="rounded-card border border-border bg-surface p-5">
                  <p className="section-stamp">{group.label}</p>
                  <p className="mt-3 text-sm leading-6 text-text-primary/80">{group.items.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">The person behind Lynvo</h2>
            {founder ? (
              <div className="mt-6 rounded-card border border-border bg-surface p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-card bg-ink-900 text-text-inverse">
                    {founder.display_name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-ink-900">{founder.display_name}</p>
                    <p className="section-stamp mt-1">{founder.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-text-primary/80">{founder.bio}</p>
                {founder.skills?.length ? <p className="mt-4 text-xs uppercase tracking-[0.2em] text-brand-700">{founder.skills.join(" / ")}</p> : null}
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  {socialLinks.map((link) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-card border border-border px-3 py-2 hover:bg-canvas-warm">
                      {link.platform}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-text-primary/60">No team members are active yet.</p>
            )}
          </div>
        </div>
      </section>

      {featuredReview && (
        <section className="container-page py-16">
          <SectionStamp label="REVIEWS" />
          <h2 className="font-display text-2xl font-semibold text-ink-900">What clients say</h2>
          <div className="mt-8 max-w-2xl rounded-card border border-border bg-surface p-6">
            <p className="text-lg leading-8 text-text-primary/80">“{featuredReview.content}”</p>
            <p className="mt-4 font-display text-lg font-semibold text-ink-900">{featuredReview.author_name}</p>
            {featuredReview.author_role && <p className="section-stamp mt-1">{featuredReview.author_role}</p>}
          </div>
        </section>
      )}

      <section className="container-page py-16">
        <SectionStamp label="LET'S BUILD" />
        <div className="grid gap-8 rounded-card border border-border bg-ink-900 p-8 text-text-inverse lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold">Have a project in mind?</h2>
            <p className="mt-4 max-w-2xl text-text-inverse/75">
              Start a conversation. We respond within 24 hours with a thoughtful, personalized response - not a template.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Link href="/contact" className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-brand-500">
              Start a project
            </Link>
            <Link href="/archive" className="text-sm text-text-inverse/80 underline-offset-4 hover:underline">
              View our work
            </Link>
            {settings.contact_email && <p className="text-sm text-text-inverse/70">{settings.contact_email}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
