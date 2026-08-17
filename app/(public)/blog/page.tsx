import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getBlogPosts } from "@/lib/queries";

export const metadata = { title: "Blog" };

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
          The blog is indexed from published CMS entries so updates in the admin immediately flow into the public site.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length > 0 ? (
          posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <ArchiveCard title={post.title} meta={post.published_at ?? "DRAFT"}>
                <p>{post.excerpt}</p>
              </ArchiveCard>
            </Link>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No published posts yet. Add rows to the `blog_posts` table to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
