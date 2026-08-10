import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { Rating } from "@/components/ui-kit/Rating";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatPrice, stockLabel } from "@/lib/format";
import { productReviewStatsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function QuickViewDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addToCart } = useStore();
  const { data: stats } = useQuery({
    ...productReviewStatsQuery(product?.id ?? ""),
    enabled: Boolean(product),
  });
  const rating = stats ? stats.average : (product?.rating ?? 0);
  const reviewCount = stats ? stats.count : (product?.review_count ?? 0);

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-sm p-0">
        {product ? (
          <div className="grid gap-0 md:grid-cols-2">
            <MediaFrame
              src={product.images?.[0]}
              alt={product.name}
              ratio="aspect-[4/5]"
              className="h-full"
            />
            <div className="flex flex-col p-7 lg:p-9">
              <p className="label-caps">{product.category?.name ?? "Pharmacy"}</p>
              <DialogTitle className="mt-2 font-display text-3xl font-normal leading-tight">
                {product.name}
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
