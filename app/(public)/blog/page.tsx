import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import { getBlogPosts } from "@/lib/queries";

export const metadata = { title: "Blog" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="container-page py-20">
      <SectionStamp label="BLOG" />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Thinking</h1>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            Notes, launches, and technical thinking from the studio.
          </p>
        </div>
        <p className="text-sm leading-6 text-text-primary/70">
          Practical guides on getting online, building a brand and growing with technology.
        </p>
      </div>
      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-text-primary/60">New articles are on the way.</p>
      ) : (
        <>
          <Link href={`/blog/${posts[0].slug}`} className="archive-card mt-10 grid overflow-hidden md:grid-cols-[1.2fr_1fr]">
            {posts[0].cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posts[0].cover_image_url} alt="" className="aspect-[16/9] h-full w-full object-cover" />
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-brand-700 to-ink-900" />
            )}
            <div className="flex flex-col justify-center p-8">
              <p className="section-stamp">LATEST{posts[0].published_at ? ` · ${formatDate(posts[0].published_at)}` : ""}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{posts[0].title}</h2>
              {posts[0].excerpt && <p className="mt-3 text-text-primary/75">{posts[0].excerpt}</p>}
              <span className="mt-6 text-sm font-medium text-brand-700">Read article →</span>
            </div>
          </Link>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(1).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="archive-card block overflow-hidden">
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover_image_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-brand-500 to-ink-900" />
                )}
                <div className="p-5">
                  {post.published_at && <p className="section-stamp">{formatDate(post.published_at)}</p>}
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink-900">{post.title}</h3>
                  {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-text-primary/75">{post.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
