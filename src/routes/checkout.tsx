import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, CreditCard, ExternalLink, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { CryptoPaymentCard } from "@/components/checkout/CryptoPaymentCard";
import { createOrder, updateOrderPaymentProof, validateCoupon } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getCryptoCoin, getQrCodeUrl, getWalletAddress } from "@/lib/crypto";
import { formatPrice } from "@/lib/format";
import { activeCouponsQuery, settingsQuery } from "@/lib/queries";
import { useStore } from "@/lib/store";
import type { Coupon, Order } from "@/lib/types";

const title = "Secure Checkout — Medi Pharma UK";
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
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "invoice">("crypto");
  const [selectedCrypto, setSelectedCrypto] = useState("usdt_trc20");
  const [cryptoTxid, setCryptoTxid] = useState("");
  const [postOrderTxid, setPostOrderTxid] = useState("");
  const [submittedTxid, setSubmittedTxid] = useState("");
  const [isSubmittingTxid, setIsSubmittingTxid] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { data: settings } = useQuery(settingsQuery());

  const [form, setForm] = useState({
    name: "",
    email: "",
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
    mutationFn: () => {
      let notes = form.notes ? form.notes.trim() : "";
      let methodString: string = paymentMethod;

      if (paymentMethod === "crypto") {
        const coin = getCryptoCoin(selectedCrypto);
        const walletAddr = getWalletAddress(selectedCrypto, settings);
        methodString = `crypto:${coin.id}`;
        const cryptoMeta = [
          `[Crypto Payment Details]`,
          `Currency: ${coin.name} (${coin.symbol})`,
          `Network: ${coin.network}`,
          `Wallet: ${walletAddr}`,
          cryptoTxid.trim() ? `TXID: ${cryptoTxid.trim()}` : `TXID: Pending submission by customer`,
        ].join("\n");
        notes = notes ? `${notes}\n\n${cryptoMeta}` : cryptoMeta;
      }

      return createOrder({
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: null,
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
        payment_method: methodString,
        notes: notes || null,
        user_id: user?.id ?? null,
        items: cart.map((line) => ({
          product_id: line.productId,
          product_name: line.name,
          product_slug: line.slug,
          image_url: line.image,
          unit_price: line.price,
          quantity: line.quantity,
        })),
      });
    },
    onSuccess: (order) => {
      setPlaced(order);
      if (cryptoTxid.trim()) {
        setSubmittedTxid(cryptoTxid.trim());
      }
      clearCart();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: activeCoupons = [] } = useQuery(activeCouponsQuery());

  async function handleValidateOrderTxid() {
    if (!placed || !postOrderTxid.trim()) return;
    try {
      setIsSubmittingTxid(true);
      const updatedNotes = [
        placed.notes || "",
        `[Blockchain Validation Proof Submitted: ${new Date().toISOString()}]`,
        `TXID: ${postOrderTxid.trim()}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await updateOrderPaymentProof(placed.id, updatedNotes, "payment_submitted");
      setSubmittedTxid(postOrderTxid.trim());
      setPostOrderTxid("");
      toast.success("Payment proof submitted! Your order is being validated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit transaction proof.");
    } finally {
      setIsSubmittingTxid(false);
    }
  }

  if (placed) {
    const isCrypto = placed.payment_method?.startsWith("crypto:");
    const coinId = isCrypto ? placed.payment_method!.replace("crypto:", "") : selectedCrypto;
    const coin = getCryptoCoin(coinId);
    const walletAddress = getWalletAddress(coinId, settings);
    const qrUrl = getQrCodeUrl(walletAddress, coin.qrPrefix);

    return (
      <section className="container-page section-y max-w-2xl text-center space-y-8">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="display-lg mt-6">Thank you — order confirmed!</h1>
          <p className="mt-3 text-muted-foreground text-sm">
            Order <span className="font-semibold text-foreground">{placed.order_number}</span> for{" "}
            <span className="font-semibold text-foreground">{formatPrice(placed.total)}</span>. A confirmation is on its way to {placed.customer_email}.
          </p>
        </div>

        {isCrypto ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-left shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Crypto Payment & Order Validation
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Send {formatPrice(placed.total)} in {coin.name} ({coin.symbol})
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                {submittedTxid ? "Validation Under Review" : "Awaiting Blockchain Transfer"}
              </span>
            </div>

            {/* Wallet & QR */}
            <div className="grid gap-5 sm:grid-cols-[130px_1fr] sm:items-center bg-background p-4 rounded-lg border border-border">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-md border border-border text-center shadow-xs">
                <img src={qrUrl} alt="Wallet QR Code" className="h-28 w-28 object-contain" />
                <span className="text-[10px] font-medium text-neutral-600 mt-1 flex items-center gap-1">
                  <QrCode className="h-3 w-3" /> {coin.symbol}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Network:</span>
                  <p className="text-xs font-semibold text-foreground">{coin.network}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Deposit Wallet Address:
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                    <span className="flex-1 font-mono text-xs break-all select-all text-foreground">
                      {walletAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(walletAddress);
                        setCopiedAddress(true);
                        toast.success("Wallet address copied!");
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        copiedAddress
                          ? "bg-emerald-600 text-white"
                          : "bg-primary text-primary-foreground hover:bg-accent"
                      }`}
                    >
                      {copiedAddress ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAddress ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Proof Status / Input */}
            {submittedTxid ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Validation Proof Submitted</span>
                </div>
                <p className="text-muted-foreground font-mono break-all pt-1">
                  TXID: {submittedTxid}
                </p>
                <div className="pt-2">
                  <a
                    href={coin.explorerUrl(submittedTxid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium"
                  >
                    <span>View on Blockchain Explorer</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-border bg-background p-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Submit Transaction Hash (TXID) to Validate Order
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste blockchain transaction hash (TXID)…"
                    value={postOrderTxid}
                    onChange={(e) => setPostOrderTxid(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleValidateOrderTxid}
                    disabled={!postOrderTxid.trim() || isSubmittingTxid}
                    className="shrink-0 bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground rounded-md transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {isSubmittingTxid ? "Submitting…" : "Validate"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Submitting your transaction ID allows us to immediately verify your blockchain transfer and fast-track dispatch.
                </p>
              </div>
            )}
          </div>
        ) : null}

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

          {/* Payment Method Selection */}
          <div className="sm:col-span-2 space-y-4 pt-6 border-t border-border mt-2">
            <div>
              <h2 className="font-display text-2xl">Payment Method</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Select your preferred payment method. Cryptocurrency provides instant validation and insured, priority dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("crypto")}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                  paymentMethod === "crypto"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div
                  className={`mt-0.5 rounded-full p-1.5 ${
                    paymentMethod === "crypto"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Cryptocurrency</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Instant · Secure
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    USDT (TRC-20), Bitcoin, Ethereum, Solana & Litecoin
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("invoice")}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                  paymentMethod === "invoice"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div
                  className={`mt-0.5 rounded-full p-1.5 ${
                    paymentMethod === "invoice"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-foreground">Bank Wire / Invoice</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bank transfer with official invoice dispatched via email
                  </p>
                </div>
              </button>
            </div>

            {paymentMethod === "crypto" ? (
              <div className="pt-2">
                <CryptoPaymentCard
                  total={total}
                  selectedCoinId={selectedCrypto}
                  onSelectCoinId={setSelectedCrypto}
                  txid={cryptoTxid}
                  onChangeTxid={setCryptoTxid}
                  settings={settings}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Bank Transfer Information</p>
                <p>
                  Upon placing your order, an official invoice with IBAN/Sort Code and wire transfer
                  instructions will be sent directly to your email address.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={orderMutation.isPending}
            className="mt-4 bg-primary px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60 sm:col-span-2"
          >
            {orderMutation.isPending
              ? "Placing order…"
              : paymentMethod === "crypto" && cryptoTxid.trim()
                ? `Validate & Place Order · ${formatPrice(total)}`
                : paymentMethod === "crypto"
                  ? `Pay with Crypto · ${formatPrice(total)}`
                  : `Place order · ${formatPrice(total)}`}
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
