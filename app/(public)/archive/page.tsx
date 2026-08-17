import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getProjects } from "@/lib/queries";

export const metadata = { title: "Archive" };

export default async function ArchivePage() {
  const projects = await getProjects();

  return (
    <div className="container-page py-20">
      <SectionStamp label="ARCHIVE" />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Case studies</h1>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            Selected work that shows how we turn strategy into shipped products, identities, and systems.
          </p>
        </div>
        <p className="text-sm leading-6 text-text-primary/70">
          Each project page can hold the challenge, approach, stack, and outcome so the public archive reflects what the studio actually delivered.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link key={project.id} href={`/archive/${project.slug}`}>
              <ArchiveCard title={project.title} meta={`${project.category ?? "PROJECT"} · ${project.industry ?? "General"}`} imageUrl={project.image_url}>
                <p>{project.excerpt}</p>
                {project.tags?.length ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-brand-700">{project.tags.join(" / ")}</p> : null}
              </ArchiveCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No published projects yet. Add rows to the `projects` table to see them here.
          </p>
        )}
      </div>
      <div className="mt-12 rounded-card border border-border bg-surface p-6">
        <p className="section-stamp">WHAT TO LOOK FOR</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-text-primary/80">
          Category, industry, stack, and outcome are surfaced directly from the database so the archive can act as a true studio ledger instead of a static gallery.
        </p>
      </div>
    </div>
  );
}
