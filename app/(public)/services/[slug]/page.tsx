import { notFound } from "next/navigation";
import SectionStamp from "@/components/ui/section-stamp";
import { createClient } from "@/lib/supabase/server";

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle();

  if (!service) notFound();

  const content = service.content as { process?: string[]; deliverables?: string[] } | null;

  return (
    <div className="container-page py-20">
      <SectionStamp label="SERVICE" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">{service.title}</h1>
      {service.excerpt && <p className="mt-4 max-w-2xl text-text-primary/80">{service.excerpt}</p>}
      {content?.process && <section className="mt-10 max-w-2xl"><h2 className="font-display text-xl font-semibold">How we work</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-text-primary/80">{content.process.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      {content?.deliverables && <section className="mt-10 max-w-2xl"><h2 className="font-display text-xl font-semibold">What you get</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-text-primary/80">{content.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
  );
}
