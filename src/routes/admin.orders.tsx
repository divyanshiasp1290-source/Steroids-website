import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrderStatus } from "@/lib/api";
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

  const columns: Column<Order>[] = [
    { key: "number", header: "Order", render: (o) => (
      <button className="font-medium text-foreground hover:underline" onClick={() => setSelected(o)}>{o.order_number}</button>
    ) },
    { key: "customer", header: "Customer", render: (o) => (
      <div><p className="text-foreground">{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_email}</p></div>
    ) },
    { key: "date", header: "Date", render: (o) => new Date(o.created_at).toLocaleDateString() },
    { key: "total", header: "Total", render: (o) => CURRENCY.format(o.total) },
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
                    <p className="text-muted-foreground">{selected.customer_phone}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Payment</p>
                    <p className="text-muted-foreground">{selected.payment_method ?? "—"} · {selected.payment_status}</p>
                  </div>
                </div>
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
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
