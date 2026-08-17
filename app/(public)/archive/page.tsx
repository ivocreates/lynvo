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
      <h1 className="font-display text-3xl font-semibold text-ink-900">Case studies</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link key={project.id} href={`/archive/${project.slug}`}>
              <ArchiveCard title={project.title} meta={project.category ?? "PROJECT"} imageUrl={project.image_url}>
                {project.excerpt}
              </ArchiveCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No published projects yet. Add rows to the `projects` table to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
