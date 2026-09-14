import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Loader2, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { getCryptoCoin } from "@/lib/crypto";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteOrder, updateOrderStatus } from "@/lib/api";
import { adminOrdersQuery } from "@/lib/queries";
import type { Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function statusVariant(status: OrderStatus): "default" | "destructive" | "outline" {
  if (status === "cancelled" || status === "refunded") return "destructive";
  if (status === "delivered" || status === "shipped") return "default";
  return "outline";
}

function AdminOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const { data: orders = [], isLoading } = useQuery(adminOrdersQuery(statusFilter));
  const [selected, setSelected] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Order status updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Order deleted successfully.");
      if (selected?.id === orderToDelete?.id) {
        setSelected(null);
      }
      setOrderToDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const columns: Column<Order>[] = [
    { key: "number", header: "Order", render: (o) => (
      <button className="font-medium text-foreground hover:underline" onClick={() => setSelected(o)}>{o.order_number}</button>
    ) },
    { key: "customer", header: "Customer", render: (o) => (
      <div><p className="text-foreground">{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_email}</p></div>
    ) },
    { key: "date", header: "Date", render: (o) => new Date(o.created_at).toLocaleDateString() },
    { key: "total", header: "Total", render: (o) => CURRENCY.format(o.total) },
    {
      key: "payment",
      header: "Payment",
      render: (o) => {
        const isCrypto = o.payment_method?.startsWith("crypto:");
        if (isCrypto) {
          const coinId = o.payment_method!.replace("crypto:", "");
          const coin = getCryptoCoin(coinId);
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Wallet className="h-3 w-3" />
              {coin.symbol}
            </span>
          );
        }
        return (
          <span className="text-xs text-muted-foreground capitalize">
            {o.payment_method ?? "Invoice"}
          </span>
        );
      },
    },
    { key: "status", header: "Status", render: (o) => (
      <Select value={o.status} onValueChange={(v) => changeStatus.mutate({ id: o.id, status: v as OrderStatus })}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue><Badge variant={statusVariant(o.status)} className="capitalize">{o.status}</Badge></SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>
    ) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (o) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOrderToDelete(o)}
            title="Delete order"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Orders" actions={
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      }>
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={orders} getRowId={(o) => o.id} />}
      </AdminSection>

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader><DialogTitle>Order {selected.order_number}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-foreground">Customer</p>
                    <p className="text-muted-foreground">{selected.customer_name}</p>
                    <p className="text-muted-foreground">{selected.customer_email}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Payment Method</p>
                    {selected.payment_method?.startsWith("crypto:") ? (
                      (() => {
                        const coinId = selected.payment_method.replace("crypto:", "");
                        const coin = getCryptoCoin(coinId);
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge className="bg-emerald-600 text-white gap-1 text-xs font-medium">
                                <Wallet className="h-3 w-3" />
                                {coin.name} ({coin.symbol})
                              </Badge>
                              <span className="text-xs text-muted-foreground capitalize">
                                · {selected.payment_status}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{coin.network}</p>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-muted-foreground capitalize">
                        {selected.payment_method ?? "Invoice"} · {selected.payment_status}
                      </p>
                    )}
                  </div>
                </div>

                {selected.notes ? (
                  <div className="rounded-md border border-border/80 bg-muted/30 p-3 space-y-1.5">
                    <p className="font-semibold text-xs text-foreground">Order & Payment Proof Notes:</p>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                      {selected.notes}
                    </pre>
                    {(() => {
                      const txMatch = selected.notes.match(/TXID:\s*([A-Za-z0-9_-]{8,})/i);
                      const txid = txMatch ? txMatch[1] : null;
                      if (txid && txid !== "Pending" && selected.payment_method?.startsWith("crypto:")) {
                        const coin = getCryptoCoin(selected.payment_method.replace("crypto:", ""));
                        return (
                          <div className="pt-1.5 border-t border-border/60">
                            <a
                              href={coin.explorerUrl(txid)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>Inspect on {coin.symbol} Blockchain Explorer</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-foreground">Shipping address</p>
                    <p className="text-muted-foreground">{JSON.stringify(selected.shipping_address ?? {})}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Billing address</p>
                    <p className="text-muted-foreground">{JSON.stringify(selected.billing_address ?? {})}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-medium text-foreground">Items</p>
                  <div className="space-y-2">
                    {(selected.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-2">
                        <div>
                          <p className="text-foreground">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Qty {item.quantity} × {CURRENCY.format(item.unit_price)}</p>
                        </div>
                        <p className="font-medium text-foreground">{CURRENCY.format(item.line_total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end text-sm">
                  <div className="space-y-1 text-right">
                    <p>Subtotal: {CURRENCY.format(selected.subtotal)}</p>
                    <p>Discount: -{CURRENCY.format(selected.discount)}</p>
                    <p>Shipping: {CURRENCY.format(selected.shipping)}</p>
                    <p>Tax: {CURRENCY.format(selected.tax)}</p>
                    <p className="font-semibold text-foreground">Total: {CURRENCY.format(selected.total)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setOrderToDelete(selected)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete Order
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(orderToDelete)} onOpenChange={(v) => !v && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <strong className="text-foreground">{orderToDelete?.order_number}</strong>? This action cannot be undone and will permanently remove this order and all associated items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (orderToDelete) {
                  deleteMutation.mutate(orderToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Order"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
