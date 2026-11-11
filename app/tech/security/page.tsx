import Link from "next/link";
import { SECURITY_SERVICES, techHref } from "@/lib/tech-site";

export const metadata = {
  title: "Cybersecurity",
  description: "VAPT, security audits, hardening and monitoring for small-business websites, apps and cloud.",
};

const STEPS = [
  { title: "Scope & authorise", text: "We agree the targets, dates and rules in a signed testing authorisation." },
  { title: "Test", text: "Automated scanning plus manual testing of logins, payments, APIs and admin areas." },
  { title: "Report", text: "Plain-language findings ranked by risk, with screenshots and step-by-step fixes." },
  { title: "Fix & retest", text: "We fix the issues (or guide your developers) and retest to confirm they are closed." },
];

export default function TechSecurityPage() {
  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">CYBERSECURITY</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">Security testing and protection for growing businesses</h1>
            <p className="mt-5 max-w-2xl text-text-inverse/75">
              Customer data, payments and your reputation depend on systems most small businesses never test. We find the weaknesses,
              fix them and keep watch.
            </p>
            <Link href={techHref("/contact?service=vapt-security-audits")} className="mt-8 inline-block rounded-card bg-sage-500 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-text-inverse">
              Request a security assessment
            </Link>
          </div>
          <ul className="space-y-2 rounded-card border border-white/10 bg-white/5 p-6 font-mono text-[13px] text-text-inverse/80">
            <li>[✓] OWASP Top 10 web &amp; API testing</li>
            <li>[✓] Authentication &amp; session review</li>
            <li>[✓] Cloud, DNS &amp; email security</li>
            <li>[✓] Backups &amp; recovery check</li>
            <li>[✓] DPDP Act data-handling review</li>
          </ul>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {SECURITY_SERVICES.map((service) => (
            <div key={service.title} className="rounded-card border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">{service.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-primary/75">{service.text}</p>
              <ul className="mt-4 space-y-1 text-sm text-text-primary/80">
                {service.points.map((point) => (
                  <li key={point}>→ {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="container-page py-16">
          <h2 className="font-display text-2xl font-semibold text-ink-900">How an assessment works</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="font-mono text-sm text-brand-500">0{index + 1}</p>
                <h3 className="mt-1 font-display font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-sm text-text-primary/75">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-3xl text-sm text-text-primary/70">
            We only test systems you own or are authorised to have tested, under a written authorisation that defines scope, timing and
            emergency contacts. Findings stay confidential to you.
          </p>
        </div>
      </section>
    </div>
  );
}
