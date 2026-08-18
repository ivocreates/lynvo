import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ProjectCta from "@/components/ui/project-cta";
import { getJobOpenings, getSiteSettings, settingsMap } from "@/lib/queries";

export const metadata = {
  title: "Careers",
  description: "Open roles and internships at LYNVO — developers, designers, strategists, and security analysts.",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  internship: "Internship",
  freelance: "Freelance",
};

const perks = [
  ["Real work, day one", "You ship to production, not to a sandbox. Every contribution is reviewed and credited."],
  ["Mentored reviews", "Weekly sessions with the founder on architecture, craft, and career direction."],
  ["Remote-friendly", "Work from anywhere with async updates and a predictable weekly rhythm."],
  ["Certificates & references", "Interns receive a verifiable completion certificate and a written reference."],
];

export default async function CareersPage() {
  const [openings, settingsRows] = await Promise.all([getJobOpenings(), getSiteSettings()]);
  const settings = settingsMap(settingsRows);

  return (
    <div>
      <div className="container-page py-20">
        <SectionStamp label="CAREERS" />
        <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Build with LYNVO</h1>
            <p className="mt-4 max-w-2xl text-text-primary/80">
              We&apos;re a small studio with a wide surface area — development, design, security, and strategy. If you
              care about craft and want your work in front of real users, we&apos;d like to meet you.
            </p>
          </div>
          <p className="text-sm leading-6 text-text-primary/70">
            No opening that fits? Send an open application anyway. We keep strong profiles on file and reach out when
            the right project lands.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Open roles</h2>
          <div className="mt-6 space-y-4">
            {openings.length > 0 ? (
              openings.map((opening) => (
                <article key={opening.id} className="rounded-card border border-border bg-surface p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="section-stamp">
                        {TYPE_LABELS[opening.employment_type] ?? opening.employment_type}
                        {opening.department ? ` · ${opening.department}` : ""}
                        {opening.location ? ` · ${opening.location}` : ""}
                      </p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">{opening.title}</h3>
                      {opening.excerpt && (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/80">{opening.excerpt}</p>
                      )}
                    </div>
                    <Link
                      href={`/contact?type=careers&role=${encodeURIComponent(opening.title)}`}
                      className="rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
                    >
                      Apply
                    </Link>
                  </div>

                  {opening.description && (
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-text-primary/80">{opening.description}</p>
                  )}

                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    {opening.responsibilities?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-700">What you&apos;ll do</p>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-text-primary/80">
                          {opening.responsibilities.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {opening.requirements?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-700">What we look for</p>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-text-primary/80">
                          {opening.requirements.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
                No roles are open right now — send an open application and we&apos;ll keep you in mind.
              </div>
            )}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Why LYNVO</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {perks.map(([title, description]) => (
              <div key={title} className="rounded-card border border-border bg-surface p-5">
                <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-text-primary/80">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ProjectCta
        contactEmail={settings.contact_email}
        title="Don't see your role?"
        description="Send an open application with your portfolio or GitHub. We read every one and reply within a week."
        primaryLabel="Send an open application"
        primaryHref="/contact?type=careers"
        secondaryLabel="Meet the team"
        secondaryHref="/team"
      />
    </div>
  );
}
