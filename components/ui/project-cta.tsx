import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";

export default function ProjectCta({
  contactEmail,
  title = "Have a project in mind?",
  description = "Start a conversation. We respond within 24 hours with a thoughtful, personalized response - not a template.",
  primaryLabel = "Start a project",
  primaryHref = "/contact",
  secondaryLabel = "View our work",
  secondaryHref = "/archive",
}: {
  contactEmail?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="container-page py-16">
      <SectionStamp label="LET'S BUILD" />
      <div className="grid gap-8 rounded-card border border-border bg-ink-900 p-8 text-text-inverse lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="mt-4 max-w-2xl text-text-inverse/75">{description}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link
            href={primaryHref}
            className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-brand-500"
          >
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="text-sm text-text-inverse/80 underline-offset-4 hover:underline">
            {secondaryLabel}
          </Link>
          {contactEmail && <p className="text-sm text-text-inverse/70">{contactEmail}</p>}
        </div>
      </div>
    </section>
  );
}
