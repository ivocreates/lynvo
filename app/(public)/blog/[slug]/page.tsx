import { notFound } from "next/navigation";
import SectionStamp from "@/components/ui/section-stamp";
import { createClient } from "@/lib/supabase/server";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  return (
    <article className="container-page py-20">
      <SectionStamp label="ARTICLE" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">{post.title}</h1>
      {post.excerpt && <p className="mt-4 max-w-2xl text-text-primary/80">{post.excerpt}</p>}
      {post.content && (
        <div className="prose mt-8 max-w-2xl text-text-primary/90">{post.content}</div>
      )}
    </article>
  );
}
