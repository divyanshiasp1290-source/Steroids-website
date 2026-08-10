import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import cartBanner from "@/assets/hero.jpg";
import { useQuery } from "@tanstack/react-query";
import { bannersQuery } from "@/lib/queries";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";

const title = "Shopping Bag — Helix Pharma UK";
const description = "Review the pieces in your bag and continue to a secure, insured checkout.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CartPage,
});

const FREE_SHIPPING_THRESHOLD = 150;

function CartPage() {
  const { cart, setQuantity, removeFromCart, subtotal } = useStore();
  const shipping = cart.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 2;

  const { data: heroBanners = [] } = useQuery(bannersQuery("cart-hero"));
  const heroImage = heroBanners.length > 0 ? heroBanners[0].image_url : cartBanner;

  return (
    <>
      <PageHeader
        eyebrow="Your selection"
        title="Shopping bag"
        description="Items are held for 60 minutes. UK delivery is free above £100."
        image={heroImage}
        imageAlt="A selection of medical products and packaging arranged in premium lighting"
      />

      <section className="container-page section-y">
        {cart.length === 0 ? (
          <EmptyState
            title="Your bag is empty"
            description="Browse the collection and add a piece to begin."
            action={
              <Link
                to="/shop"
                className="bg-primary px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
              >
                Shop the collection
              </Link>
            }
          />
        ) : (
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
            <ul className="divide-y divide-border border-y border-border">
              {cart.map((line) => (
                <li
                  key={line.productId}
                  className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-5 py-6 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                >
                  <Link to="/product/$slug" params={{ slug: line.slug }} className="block">
                    <img
                      src={line.image ?? ""}
                      alt={line.name}
                      className="aspect-[4/5] w-full bg-surface object-cover"
                    />
                  </Link>

                  <div className="min-w-0">
                    {line.brand ? <p className="label-caps">{line.brand}</p> : null}
                    <Link
                      to="/product/$slug"
                      params={{ slug: line.slug }}
                      className="mt-1 block font-display text-xl leading-snug"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{formatPrice(line.price)}</p>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="grid h-9 w-9 place-items-center transition-colors hover:bg-secondary"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          className="grid h-9 w-9 place-items-center transition-colors hover:bg-secondary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId)}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>

                  <p className="col-span-2 font-display text-xl sm:col-span-1 sm:text-right">
                    {formatPrice(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <aside className="h-fit border border-border bg-surface p-7 lg:sticky lg:top-32">
              <h2 className="font-display text-2xl">Summary</h2>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Shipping" value={shipping === 0 ? "Complimentary" : formatPrice(shipping)} />
              </dl>
              <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
                <span className="label-caps">Total</span>
                <span className="font-display text-2xl">{formatPrice(subtotal + shipping)}</span>
              </div>
              <Link
                to="/checkout"
                className="mt-7 block bg-primary px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
              >
                Proceed to checkout
              </Link>
              <Link
                to="/shop"
                className="mt-3 block px-6 py-3 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
