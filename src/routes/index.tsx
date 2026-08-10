import { createFileRoute } from "@tanstack/react-router";

import { CustomerReviews } from "@/components/home/CustomerReviews";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { Hero } from "@/components/home/Hero";
import { useQuery } from "@tanstack/react-query";
import { bannersQuery } from "@/lib/queries";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { NewsletterSection } from "@/components/marketing/NewsletterSection";
import { ProductRail } from "@/components/products/ProductRail";

const title = "Helix Pharma UK — Pharmacy-Grade Medicines Delivered";
const description =
  "Lab-tested, pharmacy-grade medication, performance support and wellness treatments. Discreet UK next-day delivery and verified batch testing on every order.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: promoBanners = [] } = useQuery(bannersQuery("home-promo"));

  return (
    <>
      <Hero />
      {promoBanners.length > 0 ? (
        <div className="container-page py-8">
          {promoBanners.map((b) => (
            <a key={b.id} href={b.cta_url ?? "#"} className="block overflow-hidden rounded-md border border-border bg-card mb-6">
              {b.image_url ? (
                <img src={b.image_url} alt={b.title ?? ""} className="w-full object-cover" />
              ) : (
                <div className="p-6">
                  <h3 className="font-display text-xl">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      ) : null}

      <div id="collection" className="scroll-mt-24">
        <FeaturedCategories />
      </div>
      <ProductRail
        collection="trending"
        eyebrow="Most ordered"
        title="Trending treatments"
        description="The products our customers reorder most this month."
      />
      <div className="border-y border-border bg-surface">
        <ProductRail
          collection="best_sellers"
          eyebrow="Proven"
          title="Best sellers"
          description="Consistently rated five stars for potency, packaging and delivery speed."
        />
      </div>
      <ProductRail
        collection="new_arrivals"
        eyebrow="Just stocked"
        title="New arrivals"
        description="Fresh batches added to the catalogue this week."
      />
      <WhyChooseUs />
      <CustomerReviews />
      <NewsletterSection />
    </>
  );
}
