import Link from "next/link";
import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getReviews } from "@/lib/queries";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="container-page py-20">
      <SectionStamp label="REVIEWS" />
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">What clients say</h1>
          <p className="mt-4 max-w-2xl text-text-primary/80">
            Testimonials and approvals drawn from the CMS so the public site reflects the current social proof.
          </p>
        </div>
        <p className="text-sm leading-6 text-text-primary/70">
          Feature the strongest feedback here and let the admin moderate the rest from the dashboard.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ArchiveCard key={review.id} title={review.author_name} meta="REVIEW">
              <p>{review.content}</p>
              {review.author_role && <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-primary/60">{review.author_role}</p>}
              {review.rating && <p className="mt-2 text-brand-700">{"★".repeat(review.rating)}</p>}
            </ArchiveCard>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No approved reviews yet. Add rows to the `reviews` table to see them here.
          </p>
        )}
      </div>
      <Link href="/contact" className="mt-12 inline-flex rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900">
        Start a project
      </Link>
    </div>
  );
}
