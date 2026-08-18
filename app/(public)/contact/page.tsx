import SectionStamp from "@/components/ui/section-stamp";
import ContactForm from "@/components/contact/contact-form";
import { getFaqs, getServices, getSiteSettings, getSocialLinks, settingsMap } from "@/lib/queries";

export const metadata = { title: "Contact" };

const ENQUIRY_TYPES = ["project", "quote", "careers", "general"];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: { type?: string; service?: string; budget?: string; role?: string; subject?: string };
}) {
  const [settingsRows, socialLinks, services, faqs] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getServices(),
    getFaqs("contact"),
  ]);
  const settings = settingsMap(settingsRows);

  // /services and /team deep-link into the form with the context pre-selected.
  const requestedType = searchParams.subject === "join" ? "careers" : searchParams.type;
  const enquiryType = requestedType && ENQUIRY_TYPES.includes(requestedType) ? requestedType : "project";
  const matchedService = services.find(
    (service) => service.slug === searchParams.service || service.title === searchParams.service
  );

  const defaults = {
    enquiryType,
    service: searchParams.role ?? matchedService?.title ?? undefined,
    budget: searchParams.budget,
    message: matchedService ? `I'd like a quote for ${matchedService.title}.\n\n` : undefined,
  };

  return (
    <div className="container-page py-20">
      <SectionStamp label="CONTACT" />
      <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            Start a conversation, build something great
          </h1>
          <p className="mt-4 max-w-xl text-text-primary/80">
            We respond within 24 hours. Every enquiry gets a thoughtful, personalized response — not a template.
          </p>
          <ContactForm
            services={services.map((service) => ({ slug: service.slug, title: service.title }))}
            defaults={defaults}
          />
        </div>
        <div className="space-y-6">
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">Studio info</p>
            <dl className="mt-4 space-y-4 text-sm leading-6 text-text-primary/80">
              {settings.contact_email && (
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Email</dt>
                  <dd>
                    <a className="underline underline-offset-4" href={`mailto:${settings.contact_email}`}>
                      {settings.contact_email}
                    </a>
                  </dd>
                </div>
              )}
              {settings.contact_phone && (
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Phone</dt>
                  <dd>
                    <a className="underline underline-offset-4" href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}>
                      {settings.contact_phone}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Location</dt>
                <dd>{settings.address || "Sawantwadi, Maharashtra, India · Available for global projects"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Response time</dt>
                <dd>{settings.response_time || "Within 24 hours — often much faster."}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">Follow along</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-card border border-border px-3 py-2 hover:bg-canvas-warm">
                  {link.platform}
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-canvas-warm p-6">
            <p className="section-stamp">Looking for work?</p>
            <p className="mt-3 text-sm leading-6 text-text-primary/80">
              We hire developers, designers, and strategists — including paid internships.
            </p>
            <a href="/careers" className="mt-4 inline-flex text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
              See open roles →
            </a>
          </div>
        </div>
      </div>

      {faqs.length > 0 && (
        <section className="mt-20">
          <SectionStamp label="FAQ" />
          <h2 className="font-display text-2xl font-semibold text-ink-900">Frequently asked</h2>
          <div className="mt-8 max-w-3xl divide-y divide-border rounded-card border border-border bg-surface">
            {faqs.map((faq) => (
              <details key={faq.id} className="group p-5">
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
  );
}
