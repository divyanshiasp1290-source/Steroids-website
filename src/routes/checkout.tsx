import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { createOrder, validateCoupon } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Coupon, Order } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { activeCouponsQuery } from "@/lib/queries";
import { fetchCoupons } from "@/lib/api";

const title = "Secure Checkout — Helix Pharma UK";
const description = "Complete your order with insured worldwide delivery and a two-year guarantee.";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Checkout,
});

const FREE_SHIPPING_THRESHOLD = 150;
const TAX_RATE = 0.08;
const field =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

function Checkout() {
  const { cart, subtotal, clearCart } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [placed, setPlaced] = useState<Order | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    city: "",
    postcode: "",
    country: "",
    notes: "",
  });

  const discount = coupon
    ? coupon.discount_type === "percentage"
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value)
    : 0;
  const discounted = Math.max(0, subtotal - discount);
  const shipping = discounted >= FREE_SHIPPING_THRESHOLD || cart.length === 0 ? 0 : 2;
  const tax = Math.round(discounted * TAX_RATE * 100) / 100;
  const total = Math.round((discounted + shipping + tax) * 100) / 100;

  const couponMutation = useMutation({
    mutationFn: () => validateCoupon(code, subtotal),
    onSuccess: (data) => {
      setCoupon(data);
      toast.success(`Code ${data.code} applied.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder({
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone || null,
        shipping_address: {
          line1: form.line1,
          city: form.city,
          postcode: form.postcode,
          country: form.country,
        },
        subtotal,
        discount,
        shipping,
        tax,
        total,
        coupon_id: coupon?.id ?? null,
        payment_method: "invoice",
        notes: form.notes || null,
        user_id: user?.id ?? null,
        items: cart.map((line) => ({
          product_id: line.productId,
          product_name: line.name,
          product_slug: line.slug,
          image_url: line.image,
          unit_price: line.price,
          quantity: line.quantity,
        })),
      }),
    onSuccess: (order) => {
      setPlaced(order);
      clearCart();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: activeCoupons = [], isLoading: couponsLoading, isError: couponsError } = useQuery(activeCouponsQuery());
  const { data: allCoupons = [], isLoading: allLoading } = useQuery({ queryKey: ["debug", "all-coupons"], queryFn: () => fetchCoupons() });


  if (placed) {
    return (
      <section className="container-page section-y max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="display-lg mt-8">Thank you — your order is confirmed.</h1>
        <p className="mt-4 text-muted-foreground">
          Order <span className="text-foreground">{placed.order_number}</span> for{" "}
          {formatPrice(placed.total)}. A confirmation is on its way to {placed.customer_email}.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/account"
            className="bg-primary px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
          >
            Track in my account
          </Link>
          <Link
            to="/shop"
            className="border border-border px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="container-page section-y max-w-xl text-center">
        <h1 className="display-lg">Nothing to check out yet.</h1>
        <p className="mt-4 text-muted-foreground">Add a piece to your bag to continue.</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/shop" })}
          className="mt-8 bg-primary px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
        >
          Shop the collection
        </button>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Delivery & payment"
        description="Insured worldwide dispatch from our Lisbon studio within two business days."
        image="https://images.unsplash.com/photo-1580281657525-6b4f9f0d411a?auto=format&fit=crop&w=1920&q=80"
        imageAlt="Checkout banner"
      />

      <section className="container-page section-y grid gap-14 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-20">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            orderMutation.mutate();
          }}
        >
          <h2 className="font-display text-2xl sm:col-span-2">Contact</h2>
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
          />
          <input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={field}
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={`${field} sm:col-span-2`}
          />

          <h2 className="mt-6 font-display text-2xl sm:col-span-2">Shipping address</h2>
          <input
            required
            placeholder="Street address"
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })}
            className={`${field} sm:col-span-2`}
          />
          <input
            required
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={field}
          />
          <input
            required
            placeholder="Postal code"
            value={form.postcode}
            onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            className={field}
          />
          <input
            required
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className={`${field} sm:col-span-2`}
          />
          <textarea
            rows={4}
            placeholder="Delivery notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${field} sm:col-span-2`}
          />

          <button
            type="submit"
            disabled={orderMutation.isPending}
            className="mt-4 bg-primary px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60 sm:col-span-2"
          >
            {orderMutation.isPending ? "Placing order…" : `Place order · ${formatPrice(total)}`}
          </button>
        </form>

        <div className="h-fit lg:sticky lg:top-32 space-y-6">
                  {activeCoupons.length > 0 ? (
                    <div className="border border-border bg-surface p-7">
                      <h2 className="font-display text-2xl">Available offers</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {activeCoupons.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCode(c.code);
                              // Try applying immediately
                              couponMutation.mutate();
                            }}
                                                    className="flex w-full max-w-xs flex-col rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 shadow-sm"
                          >
                                                    <div className="flex w-full items-center justify-between">
                                                      <span className="uppercase tracking-wide">{c.code}</span>
                                                      <span className="text-xs text-green-700">{c.discount_type === "percentage" ? `${c.discount_value}% off` : `£${c.discount_value} off`}</span>
                                                    </div>
                                                    {c.description ? (
                                                      <span className="mt-1 text-sm text-green-700 text-left w-full">{c.description}</span>
                                                    ) : null}
                                                  </button>
                                                ))}
                      </div>
                    </div>
                  ) : (
                    <div className="hidden" />
                  )}

                  <aside className="h-fit border border-border bg-surface p-7">
                    <h2 className="font-display text-2xl">Your order</h2>
                    <ul className="mt-6 space-y-4">
                      {cart.map((line) => (
                        <li key={line.productId} className="flex items-start gap-3 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            {line.name} <span className="text-muted-foreground">× {line.quantity}</span>
                          </span>
                          <span className="shrink-0">{formatPrice(line.price * line.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex gap-2 border-t border-border pt-6">
                      <input
                        placeholder="Discount code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className={field}
                      />
                      <button
                        type="button"
                        onClick={() => couponMutation.mutate()}
                        disabled={!code || couponMutation.isPending}
                        className="shrink-0 border border-border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>

                    <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
                      <Row label="Subtotal" value={formatPrice(subtotal)} />
                      {discount > 0 ? <Row label="Discount" value={`− ${formatPrice(discount)}`} /> : null}
                      <Row label="Shipping" value={shipping === 0 ? "Complimentary" : formatPrice(shipping)} />
                      <Row label="Tax" value={formatPrice(tax)} />
                    </dl>
                    <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
                      <span className="label-caps">Total</span>
                      <span className="font-display text-2xl">{formatPrice(total)}</span>
                    </div>
                  </aside>
                </div>
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
