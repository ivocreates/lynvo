import Image from "next/image";
import { headers } from "next/headers";
import { getTechUrl } from "@/lib/env";
import { siteForHost } from "@/lib/sites";
import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import Hero from "@/components/home/hero";
import ArchiveCard from "@/components/ui/archive-card";
import ProjectCta from "@/components/ui/project-cta";
import {
  getProjects,
  getReviews,
  getServices,
  getSiteSettings,
  getSocialLinks,
  getStats,
  getTeamMembers,
  settingsMap,
} from "@/lib/queries";

const principles = [
  "End-to-end thinking",
  "Long-term vision",
  "Security first",
  "Performance obsessed",
  "Data-driven growth",
  "Global + local reach",
];

const launchSteps = [
  {
    title: "Look the part",
    text: "A brand identity that earns trust: logo, colours, business cards, letterhead and social kit.",
  },
  {
    title: "Get found",
    text: "A fast website, Google Business Profile, WhatsApp and local SEO so customers can find and reach you.",
  },
  {
    title: "Grow with smart tech",
    text: "Analytics, automation and AI assistants that turn visitors into enquiries — plus care plans so nothing breaks.",
  },
];

const stackGroups = [
  { label: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { label: "Backend", items: ["Node.js", "Python", "Laravel", "Firebase", "REST / GraphQL"] },
  { label: "Security", items: ["VAPT", "OWASP Top 10", "Burp Suite", "Cisco CCST"] },
  { label: "Tools", items: ["Git", "Docker", "Stripe", "Resend", "Sentry"] },
];

function settingsObject(rows: { key: string; value: { text?: string } | null }[]) {
  return settingsMap(rows);
}

export default async function HomePage() {
  const techUrl = siteForHost(headers().get("host")) === "any" ? "/tech" : getTechUrl();
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
  const heroKicker = settings.hero_kicker || "LYNVO STUDIO / LAUNCH YOUR NEXT VENTURE ONLINE";
  const heroHeadline = settings.hero_headline || "Launch your next venture online — and keep it growing.";
  const heroDescription =
    settings.hero_description ||
    "Websites, brand identities and a complete online presence for businesses ready to be found. We bring you online, then help you grow with smarter technology and AI.";
  const heroPrimary = settings.hero_primary_cta || "Start a project";
  const heroSecondary = settings.hero_secondary_cta || "See case studies";

  return (
    <div>
      <Hero
        kicker={heroKicker}
        headline={heroHeadline}
        description={heroDescription}
        primaryCta={heroPrimary}
        secondaryCta={heroSecondary}
        stats={stats.map((stat) => ({ label: stat.label, value: stat.value, suffix: stat.suffix }))}
        showcaseImage={(featuredProjects.find((project) => project.image_url) ?? projects.find((project) => project.image_url))?.image_url ?? null}
        showcaseTitle={(featuredProjects.find((project) => project.image_url) ?? projects.find((project) => project.image_url))?.title ?? null}
      />



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
        <SectionStamp label="GO ONLINE IN THREE STEPS" />
        <h2 className="font-display text-2xl font-semibold text-ink-900">From idea to a business people can find</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {launchSteps.map((step, index) => (
            <div key={step.title} className="rounded-card border border-border bg-surface p-6">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand-700">0{index + 1}</p>
              <p className="mt-3 font-display text-lg font-semibold text-ink-900">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-text-primary/75">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-ink-900 px-6 py-5 text-text-inverse">
          <p className="text-sm text-text-inverse/85">
            {settings.studio_tech_teaser || "Need custom software, an app or a security check? That is LYNVO Tech."}
          </p>
          <a href={techUrl} className="rounded-card border border-white/25 px-4 py-2 text-sm font-medium hover:bg-white/10">
            Visit lynvo.tech →
          </a>
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

      <ProjectCta contactEmail={settings.contact_email} />
    </div>
  );
}
