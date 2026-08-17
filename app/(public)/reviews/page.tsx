import SectionStamp from "@/components/ui/section-stamp";
import ArchiveCard from "@/components/ui/archive-card";
import { getReviews } from "@/lib/queries";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="container-page py-20">
      <SectionStamp label="REVIEWS" />
      <h1 className="font-display text-3xl font-semibold text-ink-900">What clients say</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ArchiveCard key={review.id} title={review.author_name} meta="REVIEW">
              {review.content}
              {review.author_role && <p className="mt-3 text-xs uppercase tracking-wider text-text-primary/60">{review.author_role}</p>}
              {review.rating && <p className="mt-2 text-brand-700">{"★".repeat(review.rating)}</p>}
            </ArchiveCard>
          ))
        ) : (
          <p className="text-sm text-text-primary/60">
            No approved reviews yet. Add rows to the `reviews` table to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
