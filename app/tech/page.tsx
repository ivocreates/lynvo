import Link from "next/link";
import { getProjects, getServices, getSiteSettings, settingsMap } from "@/lib/queries";
import { SECURITY_SERVICES, TECH_PROCESS, TECH_SOLUTIONS, studioHref, techHref } from "@/lib/tech-site";

export default async function TechHomePage() {
  const [services, projects, settingsRows] = await Promise.all([getServices("tech"), getProjects("tech"), getSiteSettings()]);
  const settings = settingsMap(settingsRows);
  const featured = services.filter((service) => service.featured).slice(0, 6);

  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">
              {settings.tech_hero_kicker || "LYNVO TECH / SOFTWARE & SECURITY FOR SMALL BUSINESSES"}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {settings.tech_hero_headline || "Custom software that fits your business. Security that keeps it safe."}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-inverse/75">
              {settings.tech_hero_description ||
                "We build billing, inventory, booking and staff tools around the way you already work, automate the repetitive parts with AI, and test and harden your systems before attackers find the gaps."}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href={techHref("/contact")} className="rounded-card bg-sage-500 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-text-inverse">
                {settings.tech_primary_cta || "Book a free consultation"}
              </Link>
              <Link href={techHref("/security")} className="rounded-card border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">
                Get a security check
              </Link>
            </div>
          </div>
          <div className="rounded-card border border-white/10 bg-white/5 p-6 font-mono text-[13px] leading-7 text-text-inverse/80">
            <p className="text-sage-500">$ lynvo-tech --audit your-business</p>
            <p>✓ spreadsheets → one dashboard</p>
            <p>✓ WhatsApp orders → automatic invoices</p>
            <p>✓ repeat questions → AI assistant</p>
            <p>✓ website → tested &amp; hardened</p>
            <p className="mt-3 text-text-inverse/50">→ you own the code. we stay on for support.</p>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <p className="section-stamp">WHAT WE BUILD</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-2xl font-display text-3xl font-semibold text-ink-900">Software for the way small businesses actually run</h2>
          <Link href={techHref("/services")} className="text-sm text-brand-700 underline">
            All services
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(featured.length > 0
            ? featured.map((service) => ({ key: service.slug, title: service.title, text: service.excerpt ?? "", href: techHref(`/services/${service.slug}`) }))
            : TECH_SOLUTIONS.slice(0, 6).map((solution) => ({ key: solution.title, title: solution.title, text: solution.text, href: techHref("/products") }))
          ).map((card) => (
            <Link key={card.key} href={card.href} className="archive-card block p-6">
              <h3 className="font-display text-lg font-semibold text-ink-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-primary/75">{card.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="section-stamp">CYBERSECURITY</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink-900">Find the gaps before attackers do</h2>
            <p className="mt-4 text-text-primary/75">
              Small businesses are the easiest targets. Our team tests, hardens and monitors your website, apps and cloud — and explains the findings in plain language.
            </p>
            <Link href={techHref("/security")} className="mt-6 inline-block rounded-card bg-ink-900 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-brand-700">
              Explore security services
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {SECURITY_SERVICES.map((service) => (
              <li key={service.title} className="rounded-card border border-border p-5">
                <h3 className="font-display font-semibold text-ink-900">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-primary/75">{service.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-20">
        <p className="section-stamp">HOW WE WORK</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink-900">Clear scope. Weekly demos. You own it.</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-4">
          {TECH_PROCESS.map((step) => (
            <li key={step.step} className="rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-sm text-brand-500">{step.step}</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-primary/75">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {projects.length > 0 && (
        <section className="container-page pb-20">
          <p className="section-stamp">SELECTED WORK</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="archive-card p-6">
                <p className="section-stamp">{project.category ?? "Project"}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink-900">{project.title}</h3>
                {project.excerpt && <p className="mt-2 text-sm text-text-primary/75">{project.excerpt}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page flex flex-wrap items-center justify-between gap-6 py-16">
          <div>
            <h2 className="font-display text-3xl font-semibold">Tell us the process that slows you down.</h2>
            <p className="mt-2 text-text-inverse/70">A 20-minute call, a clear proposal, no obligation.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={techHref("/contact")} className="rounded-card bg-sage-500 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-text-inverse">
              Book a consultation
            </Link>
            <a href={studioHref("/")} className="rounded-card border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">
              Need a website instead? lynvo.studio
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
