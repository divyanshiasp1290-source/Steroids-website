import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/ui-kit/EmptyState";
import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { Skeleton } from "@/components/ui-kit/Skeletons";
import { categoriesQuery } from "@/lib/queries";

export function FeaturedCategories() {
  const { data, isLoading } = useQuery(categoriesQuery());

  return (
    <section className="container-page section-y">
      <SectionHeader
        eyebrow="Browse"
        title="Featured categories"
        description="Four disciplines, one standard of making."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
          {data.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              to="/shop"
              search={{ category: category.slug }}
              className="group block"
            >
              <MediaFrame src={category.image_url} alt={category.name} hoverZoom />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl">{category.name}</h3>
                <span className="label-caps transition-colors group-hover:text-accent">Shop</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Categories arrive with your catalogue" />
      )}
    </section>
  );
}
