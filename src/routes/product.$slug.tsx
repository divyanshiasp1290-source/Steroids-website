import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Heart, Minus, Plus, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProductRail } from "@/components/products/ProductRail";
import { ReviewFormDialog } from "@/components/reviews/ReviewFormDialog";
import { Badge } from "@/components/ui/badge";
import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { Rating } from "@/components/ui-kit/Rating";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { fetchProduct } from "@/lib/api";
import { formatPrice, stockLabel } from "@/lib/format";
import { productReviewsQuery, relatedProductsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable — Medi Pharma UK" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const description =
      product.short_description ?? `${product.name} — available now at Medi Pharma UK.`;
    return {
      meta: [
        { title: `${product.name} — Medi Pharma UK` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} — Medi Pharma UK` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleWishlist, isWishlisted, trackViewed } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);

  const reviews = useQuery(productReviewsQuery(product.id));
  const related = useQuery(relatedProductsQuery(product.category?.id ?? null, product.brand?.id ?? null, product.id));

  const reviewCount = reviews.data?.length ?? product.review_count ?? 0;
  const reviewAverage =
    reviews.data && reviews.data.length > 0
      ? reviews.data.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.data.length
      : (product.rating ?? 0);

  useEffect(() => {
    trackViewed(product.id);
    setActiveImage(0);
    setQuantity(1);
  }, [product.id, trackViewed]);

  const images: (string | null)[] = product.images?.length ? product.images : [null];
  const stock = stockLabel(product.stock);
  const soldOut = product.stock <= 0;
  const wishlisted = isWishlisted(product.id);

  return (
    <>
      <div className="container-page py-8">
        <nav className="label-caps flex flex-wrap items-center gap-2">
          <Link to="/" className="hover:text-accent">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-accent">Shop</Link>
          {product.category ? (
            <>
              <span>/</span>
              <Link
                to="/shop"
                search={{ category: product.category.slug }}
                className="hover:text-accent"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
        </nav>
      </div>

      <div className="container-page grid gap-12 pb-16 lg:grid-cols-2 lg:gap-16">
        <div className={cn("grid gap-4", images.length > 1 && "sm:grid-cols-[5rem_minmax(0,1fr)]")}>
          {images.length > 1 ? (
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "w-20 shrink-0 border transition-colors",
                    index === activeImage ? "border-accent" : "border-border hover:border-foreground/40",
                  )}
                  aria-label={`View image ${index + 1}`}
                >
                  <MediaFrame src={image} alt="" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="order-1 sm:order-2">
            <MediaFrame
              src={images[activeImage] ?? null}
              alt={product.name}
              loading="eager"
              className="group"
              imgClassName="transition-transform duration-700 hover:scale-[1.6] cursor-zoom-in"
            />
          </div>
        </div>

        <div className="lg:pt-4">
          {product.category ? (
            <Link
              to="/shop"
              search={{ category: product.category.slug }}
              className="eyebrow hover:text-accent"
            >
              {product.category.name}
            </Link>
          ) : null}
          <h1 className="display-lg mt-4 text-balance">{product.name}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Rating value={reviewAverage} count={reviewCount} />
            <span className="text-xs text-muted-foreground">
              {reviewCount} reviews
            </span>
          </div>

          <div className="mt-7 flex items-baseline gap-3">
            <span className="font-display text-3xl">
              {formatPrice(product.price, product.currency ?? "USD")}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price, product.currency ?? "USD")}
              </span>
            ) : null}
          </div>

          {product.short_description ? (
            <p className="mt-6 max-w-prose leading-relaxed text-muted-foreground">
              {product.short_description}
            </p>
          ) : null}

          <p className={cn("label-caps mt-6", soldOut && "text-destructive")}>
            {stock.label}
          </p>

          <div className="mt-8 flex flex-wrap items-stretch gap-3">
            <div className="flex items-center border border-border">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-4 transition-colors hover:bg-secondary"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                className="px-4 py-4 transition-colors hover:bg-secondary"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() => {
                addToCart(product, quantity);
                toast.success(`${product.name} added to your bag`);
              }}
              className="flex-1 bg-primary px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {product.stock > 0 ? "Add to bag" : "Sold out"}
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="border border-border px-5 transition-colors hover:bg-secondary"
            >
              <Heart className={cn("h-4 w-4", wishlisted && "fill-accent text-accent")} />
            </button>
          </div>

          <ul className="mt-10 grid gap-4 border-y border-border py-7 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <Truck className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
              Free discreet UK delivery over £100
            </li>
            <li className="flex items-center gap-3">
              <RotateCcw className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
              30-day returns on unopened, sealed items
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
              Third-party lab tested, batch verified
            </li>
          </ul>

          <Accordion type="single" collapsible defaultValue="description" className="mt-4">
            <AccordionItem value="description">
              <AccordionTrigger className="text-sm uppercase tracking-[0.14em]">
                Description
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {product.description ?? "Full description coming soon."}
                {product.benefits?.length ? (
                  <ul className="mt-4 list-disc space-y-1.5 pl-5">
                    {product.benefits.map((benefit: string) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                ) : null}
              </AccordionContent>
            </AccordionItem>

            {product.usage || product.ingredients ? (
              <AccordionItem value="use">
                <AccordionTrigger className="text-sm uppercase tracking-[0.14em]">
                  Use & materials
                </AccordionTrigger>
                <AccordionContent className="space-y-3 leading-relaxed text-muted-foreground">
                  {product.usage ? <p>{product.usage}</p> : null}
                  {product.ingredients ? <p>{product.ingredients}</p> : null}
                </AccordionContent>
              </AccordionItem>
            ) : null}

            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <AccordionItem value="specs">
                <AccordionTrigger className="text-sm uppercase tracking-[0.14em]">
                  Specifications
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="divide-y divide-border text-sm">
                    {(Object.entries(product.specifications) as [string, string][]).map(([key, val]) => (
                      <div key={key} className="grid grid-cols-2 gap-4 py-2.5">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd>{val}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            ) : null}

            <AccordionItem value="reviews">
              <AccordionTrigger className="text-sm uppercase tracking-[0.14em]">
                Reviews ({reviews.data?.length ?? 0})
              </AccordionTrigger>
              <AccordionContent>
                {reviews.data && reviews.data.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {reviews.data.map((review) => (
                      <li key={review.id} className="py-5 first:pt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Rating value={review.rating} />
                          {review.is_verified_purchase ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-accent/40 px-2 py-0.5 text-[10px]"
                            >
                              <BadgeCheck className="h-3 w-3 text-accent" />
                              Verified Purchase
                            </Badge>
                          ) : null}
                        </div>
                        {review.title ? (
                          <p className="mt-3 font-display text-lg">{review.title}</p>
                        ) : null}
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {review.body}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          {review.author_name}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No reviews for this piece yet.
                  </p>
                )}

                <div className="mt-6 border-t border-border pt-6">
                  <Button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-accent"
                  >
                    Write a review
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ReviewFormDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        productId={product.id}
        productName={product.name}
      />

      {related.data && related.data.length > 0 ? (
        <div className="border-t border-border">
          <ProductRail
            products={related.data}
            eyebrow="Pairs well with"
            title="You may also like"
          />
        </div>
      ) : null}
    </>
  );
}
