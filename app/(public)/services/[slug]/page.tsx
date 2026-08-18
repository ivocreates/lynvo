import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionStamp from "@/components/ui/section-stamp";
import ProjectCta from "@/components/ui/project-cta";
import { createClient } from "@/lib/supabase/server";
import { getServices, getSiteSettings, settingsMap } from "@/lib/queries";

type ServiceContent = {
  intro?: string;
  process?: string[];
  deliverables?: string[];
  outcomes?: string[];
  stack?: string[];
  faqs?: { question: string; answer: string }[];
};

async function loadService(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await loadService(params.slug);
  if (!service) return { title: "Service" };
  return {
    title: service.seo_title || service.title,
    description: service.seo_description || service.excerpt || undefined,
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const [service, allServices, settingsRows] = await Promise.all([
    loadService(params.slug),
    getServices(),
    getSiteSettings(),
  ]);

  if (!service) notFound();

  const settings = settingsMap(settingsRows);
  const content = (service.content ?? null) as ServiceContent | null;
  const related = allServices.filter((item) => item.slug !== service.slug).slice(0, 3);
  const quoteHref = `/contact?type=quote&service=${service.slug}`;

  return (
    <div>
      <div className="container-page py-20">
        <SectionStamp label="SERVICE" />
        <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">{service.title}</h1>
            {service.excerpt && <p className="mt-4 max-w-2xl text-text-primary/80">{service.excerpt}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={quoteHref}
                className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900"
              >
                Get a quote
              </Link>
              <Link
                href="/services"
                className="rounded-card border border-border px-5 py-3 text-sm font-medium text-ink-900 hover:bg-surface"
              >
                All services
              </Link>
            </div>
          </div>
          {service.tags?.length ? (
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="section-stamp">Capabilities</p>
              <p className="mt-3 text-sm leading-6 text-text-primary/80">{service.tags.join(" · ")}</p>
            </div>
          ) : null}
        </div>

        {content?.intro && <p className="mt-10 max-w-3xl text-lg leading-8 text-text-primary/80">{content.intro}</p>}

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {content?.process?.length ? (
            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900">How we work</h2>
              <ol className="mt-4 space-y-3">
                {content.process.map((item, index) => (
                  <li key={item} className="rounded-card border border-border bg-surface p-4">
                    <span className="font-mono text-xs uppercase tracking-[0.22em] text-brand-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-2 text-sm leading-6 text-text-primary/80">{item}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {content?.deliverables?.length ? (
            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900">What you get</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-text-primary/80">
                {content.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {content?.outcomes?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold text-ink-900">Outcomes we aim for</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {content.outcomes.map((item) => (
                <p
                  key={item}
                  className="rounded-card border border-border bg-canvas-warm p-5 text-sm leading-6 text-text-primary/80"
                >
                  {item}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {content?.stack?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold text-ink-900">Tools we use</h2>
            <p className="mt-3 text-sm leading-6 text-text-primary/80">{content.stack.join(" · ")}</p>
          </section>
        ) : null}

        {content?.faqs?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold text-ink-900">Questions about this service</h2>
            <div className="mt-4 max-w-3xl divide-y divide-border rounded-card border border-border bg-surface">
              {content.faqs.map((faq) => (
                <details key={faq.question} className="p-5">
                  <summary className="cursor-pointer list-none font-display text-base font-semibold text-ink-900 marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-text-primary/80">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 && (
          <section className="mt-16">
            <SectionStamp label="ALSO EXPLORE" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/services/${item.slug}`}
                  className="rounded-card border border-border bg-surface p-5 hover:bg-canvas-warm"
                >
                  <p className="font-display text-lg font-semibold text-ink-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-primary/75">{item.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <ProjectCta
        contactEmail={settings.contact_email}
        title={`Need ${service.title.toLowerCase()}?`}
        description="Tell us what you're building and we'll come back with a scoped, itemised quote — usually within 24 hours."
        primaryLabel="Get a quote"
        primaryHref={quoteHref}
      />
    </div>
  );
}
