import Link from "next/link";
import { getFaqs, getServices } from "@/lib/queries";
import { TECH_PROCESS, techHref } from "@/lib/tech-site";

export const metadata = {
  title: "Services",
  description: "Custom business software, web applications, AI automation, integrations and cybersecurity for small businesses.",
};

export default async function TechServicesPage() {
  const [services, faqs] = await Promise.all([getServices("tech"), getFaqs("services", "tech")]);

  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page py-20">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">SERVICES</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">From one painful spreadsheet to a full platform</h1>
          <p className="mt-5 max-w-2xl text-text-inverse/75">
            Start small with one process, then grow the system as your business grows. Every project is fixed-price per phase.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        {services.length === 0 ? (
          <p className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
            Services are being updated. <Link href={techHref("/contact")} className="text-brand-700 underline">Tell us what you need</Link>.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {services.map((service) => {
              const content = (service.content ?? {}) as { deliverables?: string[] };
              return (
                <Link key={service.id} href={techHref(`/services/${service.slug}`)} className="archive-card block p-6">
                  <h2 className="font-display text-xl font-semibold text-ink-900">{service.title}</h2>
                  {service.excerpt && <p className="mt-2 text-sm leading-6 text-text-primary/75">{service.excerpt}</p>}
                  {content.deliverables && content.deliverables.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm text-text-primary/80">
                      {content.deliverables.slice(0, 4).map((item) => (
                        <li key={item}>→ {item}</li>
                      ))}
                    </ul>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-surface">
        <div className="container-page py-16">
          <h2 className="font-display text-2xl font-semibold text-ink-900">How a project runs</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-4">
            {TECH_PROCESS.map((step) => (
              <li key={step.step}>
                <p className="font-mono text-sm text-brand-500">{step.step}</p>
                <h3 className="mt-1 font-display font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-sm text-text-primary/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="container-page py-16">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.id} className="rounded-card border border-border bg-surface p-5">
                <summary className="cursor-pointer font-medium text-ink-900">{faq.question}</summary>
                <p className="mt-2 text-sm text-text-primary/80">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
