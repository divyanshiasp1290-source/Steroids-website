import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/ui-kit/EmptyState";
import { Rating } from "@/components/ui-kit/Rating";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { TextSkeleton } from "@/components/ui-kit/Skeletons";
import { featuredReviewsQuery } from "@/lib/queries";

export function CustomerReviews() {
  const { data: reviews = [], isLoading, isError } = useQuery(featuredReviewsQuery());

  const reviewsToShow = reviews.slice(0, 3);

  return (
    <section className="border-y border-border bg-surface">
      <div className="container-page section-y">
        <SectionHeader eyebrow="Client letters" title="What our clients say" align="center" />

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border bg-background p-8">
                <TextSkeleton lines={4} />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState title="Client reviews appear here" />
        ) : reviewsToShow.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {reviewsToShow.map((review) => (
              <figure key={review.id} className="flex h-full flex-col border border-border bg-background p-8">
                <Rating value={review.rating} />
                {review.title ? (
                  <figcaption className="mt-5 font-display text-xl">{review.title}</figcaption>
                ) : null}
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  “{review.body}”
                </blockquote>
                <p className="label-caps mt-8">
                  {review.author_name}
                  {review.author_location ? ` · ${review.author_location}` : ""}
                </p>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState title="Client reviews appear here" />
        )}
      </div>
    </section>
  );
}
