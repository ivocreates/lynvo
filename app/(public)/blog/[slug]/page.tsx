import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionStamp from "@/components/ui/section-stamp";
import Markdown from "@/components/ui/markdown";
import ProjectCta from "@/components/ui/project-cta";
import { createClient } from "@/lib/supabase/server";
import { getBlogPosts, getSiteSettings, settingsMap } from "@/lib/queries";

async function loadPost(slug: string) {
  const supabase = createClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as Record<string, any> | null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await loadPost(params.slug);
  if (!post) return { title: "Article" };
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
    },
  };
}

function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, posts, settingsRows] = await Promise.all([loadPost(params.slug), getBlogPosts(), getSiteSettings()]);
  if (!post) notFound();

  const settings = settingsMap(settingsRows);
  const content = String(post.content ?? "");
  const published = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const more = posts.filter((entry) => entry.slug !== post.slug).slice(0, 3);

  return (
    <div>
      <article className="container-page pb-16 pt-14">
        <div className="mx-auto max-w-3xl">
          <Link href="/blog" className="text-sm text-brand-700 underline underline-offset-4">
            ← All articles
          </Link>
          <div className="mt-6">
            <SectionStamp label={post.tags?.[0] ? String(post.tags[0]).toUpperCase() : "ARTICLE"} />
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-xl leading-8 text-text-primary/75">{post.excerpt}</p>}
          <p className="mt-6 flex flex-wrap gap-x-3 text-sm text-text-primary/60">
            {published && <span>{published}</span>}
            {content && <span>· {readingMinutes(content)} min read</span>}
          </p>
        </div>

        {post.cover_image_url && /^https?:\/\//.test(post.cover_image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="mx-auto mt-10 aspect-[16/9] w-full max-w-5xl rounded-card border border-border object-cover"
          />
        )}

        {content && (
          <div className="mx-auto mt-12 max-w-3xl">
            <Markdown source={content} />
          </div>
        )}

        {post.tags?.length ? (
          <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap gap-2 border-t border-border pt-6">
            {(post.tags as string[]).map((tag) => (
              <li key={tag} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink-900">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      {more.length > 0 && (
        <section className="container-page pb-16">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Keep reading</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {more.map((entry) => (
              <Link key={entry.id} href={`/blog/${entry.slug}`} className="archive-card block overflow-hidden">
                {entry.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.cover_image_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                )}
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-ink-900">{entry.title}</h3>
                  {entry.excerpt && <p className="mt-2 line-clamp-2 text-sm text-text-primary/75">{entry.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProjectCta contactEmail={settings.contact_email} />
    </div>
  );
}
