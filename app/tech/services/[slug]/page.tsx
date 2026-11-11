import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServices } from "@/lib/queries";
import { techHref } from "@/lib/tech-site";

type ServiceContent = {
  intro?: string;
  process?: string[];
  deliverables?: string[];
  outcomes?: string[];
  stack?: string[];
  faqs?: { question: string; answer: string }[];
};

async function load(slug: string) {
  const services = await getServices("tech");
  return { service: services.find((entry) => entry.slug === slug), services };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { service } = await load(params.slug);
  return service ? { title: service.title, description: service.excerpt ?? undefined } : { title: "Service" };
}

export default async function TechServicePage({ params }: { params: { slug: string } }) {
  const { service, services } = await load(params.slug);
  if (!service) notFound();

  const content = (service.content ?? {}) as ServiceContent;
  const others = services.filter((entry) => entry.slug !== service.slug).slice(0, 3);
  const sections: { title: string; items?: string[] }[] = [
    { title: "How it works", items: content.process },
    { title: "What you get", items: content.deliverables },
    { title: "What changes for you", items: content.outcomes },
    { title: "Built with", items: content.stack },
  ];

  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page py-20">
          <Link href={techHref("/services")} className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">
            ← Services
          </Link>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">{service.title}</h1>
          {service.excerpt && <p className="mt-5 max-w-2xl text-lg text-text-inverse/75">{service.excerpt}</p>}
          <Link
            href={techHref(`/contact?service=${service.slug}`)}
            className="mt-8 inline-block rounded-card bg-sage-500 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-text-inverse"
          >
            Discuss your project
          </Link>
        </div>
      </section>

      <section className="container-page py-16">
        {content.intro && <p className="max-w-3xl text-lg leading-8 text-text-primary/85">{content.intro}</p>}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {sections
            .filter((section) => section.items && section.items.length > 0)
            .map((section) => (
              <div key={section.title} className="rounded-card border border-border bg-surface p-6">
                <h2 className="font-display text-lg font-semibold text-ink-900">{section.title}</h2>
                <ul className="mt-3 space-y-2 text-sm text-text-primary/80">
                  {section.items!.map((item) => (
                    <li key={item}>→ {item}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {content.faqs && content.faqs.length > 0 && (
          <div className="mt-12 space-y-3">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Questions</h2>
            {content.faqs.map((faq) => (
              <details key={faq.question} className="rounded-card border border-border bg-surface p-5">
                <summary className="cursor-pointer font-medium text-ink-900">{faq.question}</summary>
                <p className="mt-2 text-sm text-text-primary/80">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="container-page pb-20">
          <h2 className="font-display text-xl font-semibold text-ink-900">Related services</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {others.map((entry) => (
              <Link key={entry.slug} href={techHref(`/services/${entry.slug}`)} className="archive-card block p-5">
                <p className="font-medium text-ink-900">{entry.title}</p>
                {entry.excerpt && <p className="mt-1 text-sm text-text-primary/70">{entry.excerpt}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
