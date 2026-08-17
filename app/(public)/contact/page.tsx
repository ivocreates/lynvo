import SectionStamp from "@/components/ui/section-stamp";
import ContactForm from "@/components/contact/contact-form";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page py-20">
      <SectionStamp label="CONTACT" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">Let&apos;s talk</h1>
      <p className="mt-4 max-w-xl text-text-primary/80">
        Tell us about your project and we&apos;ll get back to you shortly.
      </p>
      <ContactForm />
    </div>
  );
}
