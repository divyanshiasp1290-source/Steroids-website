import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import wishlistBanner from "@/assets/about-lab.jpg";
import { bannersQuery } from "@/lib/queries";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { ProductGridSkeleton } from "@/components/ui-kit/Skeletons";
import { productsByIdsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";

const title = "Wishlist — Helix Pharma UK";
const description = "The pieces you've saved for later, kept in one place.";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { wishlist } = useStore();
  const { data, isLoading } = useQuery({
    ...productsByIdsQuery(wishlist),
    enabled: wishlist.length > 0,
  });

  const { data: heroBanners = [] } = useQuery(bannersQuery("wishlist-hero"));
  const heroImage = heroBanners.length > 0 ? heroBanners[0].image_url : wishlistBanner;

  return (
    <>
      <PageHeader
        eyebrow="Saved"
        title="Your wishlist"
        description="Saved pieces stay on this device until you move them to your bag."
        image={heroImage}
        imageAlt="Laboratory workspace with medical vials and analytical equipment"
      />

      <section className="container-page section-y">
        {wishlist.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            description="Tap the heart on any piece to keep it here."
            action={
              <Link
                to="/shop"
                className="bg-primary px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
              >
                Browse the collection
              </Link>
            }
          />
        ) : isLoading ? (
          <ProductGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7 xl:grid-cols-5">
            {(data ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
