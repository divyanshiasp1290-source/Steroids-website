import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import accountBanner from "@/assets/account-hero.svg";
import { ReviewFormDialog } from "@/components/reviews/ReviewFormDialog";
import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { bannersQuery, productsByIdsQuery } from "@/lib/queries";
import { fetchProfile, updateOrderStatus, createRefundRequest } from "@/lib/api";
import { signOut, useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { myOrdersQuery } from "@/lib/queries";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import type { OrderStatus } from "@/lib/types";

const title = "My Account — Helix Pharma UK";
const description = "Track orders, review your details and manage your Helix Pharma UK profile.";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Account,
});

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-secondary text-foreground",
  confirmed: "bg-secondary text-foreground",
  processing: "bg-accent/15 text-accent",
  shipped: "bg-accent/15 text-accent",
  delivered: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

function Account() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
const [cancelling, setCancelling] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    productId: string | null;
    productName: string;
  } | null>(null);

  const { data: orders, isLoading } = useQuery({
    ...myOrdersQuery(user?.id ?? ""),
    enabled: Boolean(user?.id),
  });

const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  });

  // Collect all product ids across the user's orders so we can fall back to the
  // current product image when the order item has no stored image.
  const orderProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of orders ?? []) for (const it of o.items ?? []) if (it.product_id) ids.add(it.product_id);
    return [...ids];
  }, [orders]);

  const { data: orderProducts = [] } = useQuery({
    ...productsByIdsQuery(orderProductIds),
    enabled: orderProductIds.length > 0,
  });

  const productImageById = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const p of orderProducts) map[p.id] = p.images?.[0] ?? null;
    return map;
  }, [orderProducts]);

  const cancelMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await updateOrderStatus(id, "cancelled");
    },
    onSuccess: async (_, variables) => {
      toast.success("Order cancelled.");
      setCancelling(null);
      // refresh the user's orders
      void queryClient.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      // also refresh admin list if needed
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      setCancelling(null);
      toast.error(err?.message || "Could not cancel order.");
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      await createRefundRequest(orderId, user?.id ?? null, reason);
    },
    onSuccess: () => {
      toast.success("Refund request submitted. We'll review and process it shortly.");
      void queryClient.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not submit refund request.");
    },
  });

  async function handleCancel(orderId: string, status: OrderStatus) {
    // only allow cancelling of certain statuses
    const allowed: OrderStatus[] = ["pending", "confirmed", "processing"];
    if (!allowed.includes(status)) {
      toast.error("This order cannot be cancelled.");
      return;
    }
    const ok = window.confirm("Are you sure you want to cancel this order?");
    if (!ok) return;
    setCancelling(orderId);
    cancelMutation.mutate({ id: orderId });
  }

  async function handleRequestRefund(orderId: string) {
    // Ask user for a short reason
    const reason = window.prompt("Please enter a short reason for your refund request:");
    if (!reason) return;
    refundMutation.mutate({ orderId, reason });
  }

  if (!loading && !user) {
    return (
      <>
        <PageHeader
          eyebrow="Account"
          title="Sign in to your account"
          description="Track orders, save addresses and keep your wishlist across devices."
        />
        <section className="container-page section-y">
          <EmptyState
            title="You're signed out"
            description="Sign in or create an account to view your order history."
            action={
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/login"
                  className="bg-primary px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="border border-border px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
                >
                  Create account
                </Link>
              </div>
            }
          />
        </section>
      </>
    );
  }

  const { data: heroBanners = [] } = useQuery(bannersQuery("account-hero"));
  const heroImage = heroBanners.length > 0 ? heroBanners[0].image_url : accountBanner;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={profile?.full_name ? `Welcome, ${profile.full_name}` : "My account"}
        description={user?.email ?? "Your orders and details."}
        image={heroImage}
        imageAlt="Abstract premium healthcare artwork for the account page"
      />

      <section className="container-page section-y grid gap-14 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20">
        <aside className="h-fit border border-border bg-surface p-7 lg:sticky lg:top-32">
          <p className="label-caps">Signed in as</p>
          <p className="mt-2 break-words text-sm">{user?.email}</p>
          {profile?.created_at ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Member since {formatDate(profile.created_at)}
            </p>
          ) : null}
          <div className="mt-7 space-y-3">
            <Link
              to="/wishlist"
              className="block border border-border px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
            >
              My wishlist
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="w-full px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div>
          <h2 className="font-display text-3xl">Order history</h2>
          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading your orders…</p>
          ) : (orders ?? []).length === 0 ? (
            <EmptyState
              className="mt-8"
              title="No orders yet"
              description="Your completed orders will appear here with live status updates."
            />
          ) : (
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {(orders ?? []).map((order) => (
                <li key={order.id} className="py-6">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-xl">{order.order_number}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {formatDate(order.created_at)} · {order.items?.length ?? 0} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_TONE[order.status]}`}
                      >
                        {order.status}
                      </span>
                      <p className="mt-2 font-display text-xl">{formatPrice(order.total)}</p>
                          {/* Cancel button for eligible orders */}
                          {order.status !== "cancelled" && order.status !== "refunded" ? (
                            <div className="mt-3 space-x-2">
                              <button
                                type="button"
                                onClick={() => void handleCancel(order.id, order.status)}
                                disabled={cancelling === order.id || cancelMutation.isLoading}
                                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                              >
                                {cancelling === order.id ? "Cancelling…" : "Cancel order"}
                              </button>
                              {/* Show refund request when payment was captured and not already refunded */}
                              {order.payment_status === "paid" && order.status !== "refunded" ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRequestRefund(order.id)}
                                  disabled={refundMutation.isLoading}
                                  className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                                >
                                  {refundMutation.isLoading ? "Submitting…" : "Request refund"}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
{order.items?.length ? (
                    <ul className="mt-5 divide-y divide-border">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                          {/* Product image — use the stored order item image, fall back to the current product image */}
                          <MediaFrame
                            src={productImageById[item.product_id ?? ""] ?? item.image_url}
                            alt={item.product_name}
                            ratio="aspect-square"
                            className="h-16 w-16 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.product_name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Qty {item.quantity} · {formatPrice(item.unit_price)}
                            </p>
                          </div>
                          {/* Give review option — only for delivered orders (API requires a delivered purchase) */}
                          {order.status === "delivered" && item.product_id ? (
                            <button
                              type="button"
                              onClick={() =>
                                setReviewTarget({
                                  productId: item.product_id,
                                  productName: item.product_name,
                                })
                              }
                              className="inline-flex shrink-0 items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              Give a review
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ReviewFormDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        productId={reviewTarget?.productId ?? ""}
        productName={reviewTarget?.productName ?? ""}
      />
    </>
  );
}
