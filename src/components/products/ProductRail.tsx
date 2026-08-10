import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ProductCard } from "@/components/products/ProductCard";
import { QuickViewDialog } from "@/components/products/QuickViewDialog";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { SectionHeader } from "@/components/ui-kit/SectionHeader";
import { ProductGridSkeleton } from "@/components/ui-kit/Skeletons";
import { collectionQuery } from "@/lib/queries";
import type { Product } from "@/lib/types";
import { isBackendConfigured } from "@/lib/supabase";
import { demoProducts } from "@/lib/demoData";

export function ProductRail({
  collection,
  products,
  eyebrow,
  title,
  description,
  limit = 5,
}: {
  collection?: "trending" | "best_sellers" | "new_arrivals" | undefined;
  products?: Product[] | undefined;
  eyebrow?: string;
  title: string;
  description?: string;
  limit?: number;
}) {
  const query = useQuery({
    ...collectionQuery(collection ?? "trending", limit),
    enabled: !products,
  });
  const data = products ?? query.data;
  const isLoading = !products && query.isLoading;
  const [quickView, setQuickView] = useState<Product | null>(null);

  // If the backend is not configured (or returns no items), show demo products so
  // the UI sections like "Trending treatments", "Best sellers" and "New arrivals"
  // display something useful on a fresh/local install.
  let displayData: Product[] | undefined = data;
  if ((!data || data.length === 0) && !isLoading) {
    if (!isBackendConfigured) {
      // Filter demo products by collection flag when available
      displayData = demoProducts.filter((p) => {
        if (!collection) return true;
        return collection === "trending"
          ? Boolean(p.is_trending)
          : collection === "best_sellers"
          ? Boolean(p.is_best_seller)
          : Boolean(p.is_new_arrival);
      }).slice(0, limit);
    } else {
      displayData = data;
    }
  }


  return (
    <section className="container-page section-y">
      <SectionHeader
        {...(eyebrow ? { eyebrow } : {})}
        title={title}
        {...(description ? { description } : {})}
        action={
          <Link
            to="/shop"
            className="link-underline text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            View all
          </Link>
        }
      />

      {isLoading ? (
        <ProductGridSkeleton count={limit} />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7 xl:grid-cols-5">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} onQuickView={setQuickView} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      <QuickViewDialog product={quickView} onOpenChange={(open) => !open && setQuickView(null)} />
    </section>
  );
}
