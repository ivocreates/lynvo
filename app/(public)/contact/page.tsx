import SectionStamp from "@/components/ui/section-stamp";
import ContactForm from "@/components/contact/contact-form";
import { getSiteSettings, getSocialLinks } from "@/lib/queries";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const [settingsRows, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value?.text ?? ""])) as Record<string, string>;

  return (
    <div className="container-page py-20">
      <SectionStamp label="CONTACT" />
      <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Let&apos;s talk</h1>
          <p className="mt-4 max-w-xl text-text-primary/80">
            Tell us about your project and we&apos;ll get back to you shortly.
          </p>
          <ContactForm />
        </div>
        <div className="space-y-6">
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">Studio info</p>
            <p className="mt-4 text-sm leading-6 text-text-primary/80">{settings.address || "Sawantwadi, Maharashtra, India · Available for global projects"}</p>
            {settings.contact_email && <a className="mt-4 block text-sm underline underline-offset-4" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>}
            {settings.response_time && <p className="mt-4 text-sm leading-6 text-text-primary/80">{settings.response_time}</p>}
          </div>
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="section-stamp">Social</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-card border border-border px-3 py-2 hover:bg-canvas-warm">
                  {link.platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
