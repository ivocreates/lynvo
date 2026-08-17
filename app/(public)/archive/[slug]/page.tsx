import { notFound } from "next/navigation";
import SectionStamp from "@/components/ui/section-stamp";
import { createClient } from "@/lib/supabase/server";

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!project) notFound();

  const content = project.content as Record<string, unknown> | null;

  return (
    <div className="container-page py-20">
      <SectionStamp label={project.category ?? "CASE STUDY"} />
      <h1 className="font-display text-3xl font-semibold text-ink-900">{project.title}</h1>
      {project.excerpt && <p className="mt-4 max-w-2xl text-text-primary/80">{project.excerpt}</p>}
      {project.image_url && <img src={project.image_url} alt="" className="mt-10 aspect-video max-w-4xl object-cover" />}
      {content && <div className="prose mt-10 max-w-2xl text-text-primary/90">{Object.entries(content).map(([heading, value]) => <section key={heading} className="mb-8"><h2 className="font-display text-xl font-semibold capitalize">{heading.replaceAll("_", " ")}</h2><p className="mt-2 whitespace-pre-line">{Array.isArray(value) ? value.join("\n") : String(value)}</p></section>)}</div>}
    </div>
  );
}
