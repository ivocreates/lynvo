import ContactForm from "@/components/contact/contact-form";
import { getServices, getSiteSettings, settingsMap } from "@/lib/queries";

export const metadata = { title: "Contact", description: "Book a free consultation about custom software or a security assessment." };

const BUDGETS = ["Under ₹50,000", "₹50,000 – ₹1,50,000", "₹1,50,000 – ₹5,00,000", "₹5,00,000+", "Not sure yet"];

export default async function TechContactPage({ searchParams }: { searchParams: { service?: string } }) {
  const [services, settingsRows] = await Promise.all([getServices("tech"), getSiteSettings()]);
  const settings = settingsMap(settingsRows);
  const matched = services.find((service) => service.slug === searchParams.service);
  const email = settings.tech_contact_email || settings.contact_email;

  return (
    <div className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_0.7fr]">
      <div>
        <p className="section-stamp">CONTACT</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Book a free consultation</h1>
        <p className="mt-4 max-w-xl text-text-primary/80">
          Tell us about the process you want to improve or the system you want tested. We reply within one business day.
        </p>
        <ContactForm
          site="tech"
          budgets={BUDGETS}
          services={services.map((service) => ({ slug: service.slug, title: service.title }))}
          defaults={{
            enquiryType: "project",
            service: matched?.title,
            message: matched ? `I'd like to talk about ${matched.title}.\n\n` : undefined,
          }}
        />
      </div>
      <aside className="space-y-5">
        <div className="rounded-card border border-border bg-surface p-6 text-sm leading-6 text-text-primary/80">
          <p className="section-stamp">What happens next</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>We read your message and reply within one business day.</li>
            <li>A 20-minute call to understand the problem.</li>
            <li>A clear, fixed-price proposal — accept it online when ready.</li>
          </ol>
        </div>
        {email && (
          <div className="rounded-card border border-border bg-surface p-6 text-sm">
            <p className="section-stamp">Email</p>
            <a href={`mailto:${email}`} className="mt-2 block underline underline-offset-4">
              {email}
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
