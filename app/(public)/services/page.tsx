import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import ProjectCta from "@/components/ui/project-cta";
import { getFaqs, getServices, getSiteSettings, settingsMap } from "@/lib/queries";

export const metadata = { title: "Services" };

const PROCESS = [
  ["01", "Discover", "We learn your business, goals, audience, and competition — a complete picture before a single line of code."],
  ["02", "Plan", "A detailed roadmap: architecture, design direction, milestones, and measurable outcomes, approved before execution."],
  ["03", "Build", "Iterative development with regular check-ins. You see progress early and often — no big-reveal surprises."],
  ["04", "Test", "Rigorous QA across devices and browsers, plus performance testing, security review, and accessibility checks."],
  ["05", "Launch", "Smooth deployment, monitoring setup, and post-launch support. We stay to make sure everything runs perfectly."],
  ["06", "Grow", "Analytics review, ongoing optimization, and scaling. We don't ship and leave — we stay and help you grow."],
];

const ENGAGEMENTS = [
  ["Fixed-scope project", "A defined brief, a fixed quote, and a dated delivery plan. Best for launches and redesigns."],
  ["Monthly retainer", "A reserved block of studio time each month for ongoing product, design, and growth work."],
  ["Audit & advisory", "A focused review — performance, SEO, or security — delivered as a prioritised action report."],
];

export default async function ServicesPage() {
  const [services, settingsRows, faqs] = await Promise.all([
    getServices(),
    getSiteSettings(),
    getFaqs("services"),
  ]);
  const settings = settingsMap(settingsRows);

  return (
    <div>
      <div className="container-page py-20">
        <SectionStamp label="SERVICES" />
        <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              Full-spectrum digital services
            </h1>
            <p className="mt-4 max-w-2xl text-text-primary/80">
              From concept to code to launch — every service a modern digital business needs. We don&apos;t specialize in
              one thing. We specialize in making your whole digital presence work together.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact?type=quote"
                className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900"
              >
                Get a quote
              </Link>
              <Link
                href="/archive"
                className="rounded-card border border-border px-5 py-3 text-sm font-medium text-ink-900 hover:bg-surface"
              >
                See the work
              </Link>
            </div>
          </div>
          <p className="text-sm leading-6 text-text-primary/70">
            Every engagement follows the same studio rhythm: clarify the opportunity, design the system, ship the
            product, then keep improving it. You get an itemised quote before anything starts.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.length > 0 ? (
            services.map((service) => {
              const content = service.content as { deliverables?: string[] } | null;

              return (
                <div key={service.id} className="flex flex-col">
                  <Link href={`/services/${service.slug}`} className="flex-1">
                    <ArchiveCard title={service.title} meta="SERVICE" imageUrl={service.image_url}>
                      <p>{service.excerpt}</p>
                      {content?.deliverables?.length ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-text-primary/75">
                          {content.deliverables.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      {service.tags?.length ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">
                          {service.tags.join(" / ")}
                        </p>
                      ) : null}
                    </ArchiveCard>
                  </Link>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <Link
                      href={`/contact?type=quote&service=${service.slug}`}
                      className="rounded-card bg-ink-900 px-4 py-2 font-medium text-text-inverse hover:bg-brand-700"
                    >
                      Get a quote
                    </Link>
                    <Link
                      href={`/services/${service.slug}`}
                      className="text-brand-700 underline-offset-4 hover:underline"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-text-primary/60">
              No services published yet. Add rows to the `services` table to see them here.
            </p>
          )}
        </div>

        <section className="mt-16">
          <SectionStamp label="PROCESS" />
          <h2 className="font-display text-2xl font-semibold text-ink-900">Our process</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS.map(([step, title, description]) => (
              <div key={step} className="rounded-card border border-border bg-surface p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand-700">{step}</p>
                <p className="mt-3 font-display text-lg font-semibold text-ink-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-text-primary/80">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionStamp label="ENGAGEMENTS" />
          <h2 className="font-display text-2xl font-semibold text-ink-900">How we work together</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {ENGAGEMENTS.map(([title, description]) => (
              <div key={title} className="rounded-card border border-border bg-canvas-warm p-5">
                <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-text-primary/80">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {faqs.length > 0 && (
          <section className="mt-16">
            <SectionStamp label="FAQ" />
            <div className="mt-6 max-w-3xl divide-y divide-border rounded-card border border-border bg-surface">
              {faqs.map((faq) => (
                <details key={faq.id} className="p-5">
                  <summary className="cursor-pointer list-none font-display text-lg font-semibold text-ink-900 marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-text-primary/80">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      <ProjectCta contactEmail={settings.contact_email} />
    </div>
  );
}
