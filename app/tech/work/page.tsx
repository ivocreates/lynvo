import Link from "next/link";
import { getProjects } from "@/lib/queries";
import { techHref } from "@/lib/tech-site";

export const metadata = { title: "Work", description: "Software and security projects delivered by LYNVO Tech." };

export default async function TechWorkPage() {
  const projects = await getProjects("tech");

  return (
    <div>
      <section className="bg-ink-900 text-text-inverse">
        <div className="container-page py-20">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-sage-500">WORK</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">Systems we have shipped</h1>
        </div>
      </section>
      <section className="container-page py-16">
        {projects.length === 0 ? (
          <p className="rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
            Case studies are on their way. <Link href={techHref("/contact")} className="text-brand-700 underline">Ask us for references</Link>.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {projects.map((project) => {
              const content = (project.content ?? {}) as { challenge?: string; outcome?: string; stack?: string[] };
              return (
                <article key={project.id} className="archive-card p-6">
                  <p className="section-stamp">{[project.category, project.industry].filter(Boolean).join(" · ")}</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-ink-900">{project.title}</h2>
                  {project.excerpt && <p className="mt-2 text-sm text-text-primary/75">{project.excerpt}</p>}
                  {content.outcome && <p className="mt-4 text-sm font-medium text-success">{content.outcome}</p>}
                  {content.stack && (
                    <p className="mt-3 font-mono text-xs text-text-primary/60">{content.stack.join(" · ")}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
