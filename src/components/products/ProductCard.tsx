import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { Rating } from "@/components/ui-kit/Rating";
import { formatPrice, stockLabel } from "@/lib/format";
import { productReviewStatsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (product: Product) => void;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const { data: stats } = useQuery(productReviewStatsQuery(product.id));
  const stock = stockLabel(product.stock ?? 0);
  const wishlisted = isWishlisted(product.id);
  const onSale =
    product.compare_at_price !== null && (product.compare_at_price ?? 0) > product.price;
  const rating = stats ? stats.average : (product.rating ?? 0);
  const reviewCount = stats ? stats.count : (product.review_count ?? 0);

  return (
    <article className="group flex h-full flex-col">
      <div className="relative">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          aria-label={product.name}
          className="block"
        >
          <MediaFrame src={product.images?.[0]} alt={product.name} hoverZoom />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.is_new_arrival ? <Tag>New</Tag> : null}
          {onSale ? <Tag tone="accent">Sale</Tag> : null}
        </div>

        <button
          type="button"
          onClick={() => {
            toggleWishlist(product.id);
            toast(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
          }}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-foreground opacity-0 shadow-soft backdrop-blur transition-all duration-300 hover:bg-card focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-accent text-accent")} />
        </button>

        <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
          <button
            type="button"
            disabled={(product.stock ?? 0) <= 0}
            onClick={() => {
              addToCart(product);
              toast.success(`${product.name} added to bag`);
            }}
            className="flex flex-1 items-center justify-center gap-2 bg-primary px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {(product.stock ?? 0) > 0 ? "Add to bag" : "Sold out"}
          </button>
          {onQuickView ? (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              aria-label="Quick view"
              className="grid w-11 place-items-center bg-card text-foreground shadow-soft transition-colors hover:bg-secondary"
            >
              <Eye className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <p className="label-caps">{product.category?.name ?? "Pharmacy"}</p>
        <h3 className="mt-1.5 font-display text-lg leading-snug">
          <Link to="/product/$slug" params={{ slug: product.slug }} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-2">
          <Rating value={rating} count={reviewCount} />
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {formatPrice(product.price, product.currency ?? "USD")}
            </span>
            {onSale ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compare_at_price, product.currency ?? "USD")}
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              stock.tone === "success" && "text-success",
              stock.tone === "accent" && "text-accent",
              stock.tone === "muted" && "text-muted-foreground",
            )}
          >
            {stock.label}
          </span>
        </div>

        <button
          type="button"
          disabled={(product.stock ?? 0) <= 0}
          onClick={() => {
            addToCart(product);
            toast.success(`${product.name} added to bag`);
          }}
          className="mt-4 w-full border border-border py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 md:hidden"
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={cn(
        "px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]",
        tone === "accent" ? "bg-accent text-accent-foreground" : "bg-card text-foreground",
      )}
    >
      {children}
    </span>
  );
}
