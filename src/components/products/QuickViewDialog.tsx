import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { Rating } from "@/components/ui-kit/Rating";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { decodeHtml, formatPrice, stockLabel } from "@/lib/format";
import { productReviewStatsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickViewDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addToCart } = useStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const { data: stats } = useQuery({
    ...productReviewStatsQuery(product?.id ?? ""),
    enabled: Boolean(product),
  });
  const rating = stats ? stats.average : (product?.rating ?? 0);
  const reviewCount = stats ? stats.count : (product?.review_count ?? 0);

  const images = (product?.images || []).filter(Boolean);
  const displayName = decodeHtml(product?.name);

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-sm p-0">
        {product ? (
          <div className="grid gap-0 md:grid-cols-2">
            <div className="relative flex flex-col justify-between bg-surface">
              <div className="relative h-full w-full">
                <MediaFrame
                  src={images[activeImageIndex] ?? null}
                  alt={displayName}
                  ratio="aspect-[4/5]"
                  className="h-full"
                />
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/85 p-2 text-foreground shadow-soft backdrop-blur transition hover:bg-card hover:scale-110"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/85 p-2 text-foreground shadow-soft backdrop-blur transition hover:bg-card hover:scale-110"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                      {activeImageIndex + 1} / {images.length}
                    </div>
                  </>
                ) : null}
              </div>
              {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-t border-border bg-card p-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "h-12 w-12 shrink-0 overflow-hidden border-2 transition-all",
                        idx === activeImageIndex
                          ? "border-accent shadow-sm"
                          : "border-transparent opacity-60 hover:opacity-100",
                      )}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col p-7 lg:p-9">
              <p className="label-caps">{product.category?.name ?? "Pharmacy"}</p>
              <DialogTitle className="mt-2 font-display text-3xl font-normal leading-tight">
                {displayName}
              </DialogTitle>
              <div className="mt-3">
                <Rating value={rating} count={reviewCount} />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {product.short_description ?? product.description?.slice(0, 220)}
              </p>
              <p className="mt-6 text-xl font-semibold">
                {formatPrice(product.price, product.currency ?? "USD")}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {stockLabel(product.stock ?? 0).label}
              </p>

              <div className="mt-auto space-y-3 pt-8">
                <button
                  type="button"
                  disabled={(product.stock ?? 0) <= 0}
                  onClick={() => {
                    addToCart(product);
                    toast.success(`${product.name} added to bag`);
                    onOpenChange(false);
                  }}
                  className="w-full bg-primary py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  Add to bag
                </button>
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  onClick={() => onOpenChange(false)}
                  className="block w-full border border-border py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
                >
                  View full details
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
