import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getServices, getProjects, getStats } from "@/lib/queries";

export default async function HomePage() {
  const [services, projects, stats] = await Promise.all([
    getServices(),
    getProjects(),
    getStats(),
  ]);

  return (
    <div>
      <section className="container-page py-24">
        <SectionStamp label="LYNVO DIGITAL STUDIO / LINKING IDEAS TO INNOVATION" />
        <h1 className="max-w-3xl font-display text-4xl font-semibold text-ink-900 sm:text-5xl">
          Consistent. Clear. Confident.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-text-primary/80">
          We build, redesign, troubleshoot, and ship - from landing pages to complex platforms,
          brand identities to graphic design, and social media systems that help you grow your audience.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/contact"
            className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900"
          >
            Start a project
          </Link>
          <Link
            href="/archive"
            className="rounded-card border border-border px-5 py-3 text-sm font-medium text-ink-900 hover:bg-surface"
          >
            See our work
          </Link>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionStamp label="SERVICES" />
        <h2 className="font-display text-2xl font-semibold text-ink-900">What we do</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.length > 0 ? (
            services.map((service) => (
              <ArchiveCard key={service.id} title={service.title} meta="SERVICE">
                {service.excerpt}
              </ArchiveCard>
            ))
          ) : (
            <p className="text-sm text-text-primary/60">
              No services published yet. Add rows to the `services` table to see them here.
            </p>
          )}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionStamp label="FEATURED WORK" />
        <h2 className="font-display text-2xl font-semibold text-ink-900">Recent projects</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <ArchiveCard key={project.id} title={project.title} meta={project.category ?? "PROJECT"}>
                {project.excerpt}
              </ArchiveCard>
            ))
          ) : (
            <p className="text-sm text-text-primary/60">
              No published projects yet. Add rows to the `projects` table to see them here.
            </p>
          )}
        </div>
      </section>

      {stats.length > 0 && (
        <section className="bg-ink-900 py-16 text-text-inverse">
          <div className="container-page grid gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.id}>
                <p className="font-display text-3xl font-semibold">
                  {stat.value}
                  {stat.suffix}
                </p>
                <p className="section-stamp mt-2 text-text-inverse/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
