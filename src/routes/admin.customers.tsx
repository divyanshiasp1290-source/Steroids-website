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
import { fetchMyOrders, setCustomerBlocked } from "@/lib/api";
import { customersQuery } from "@/lib/queries";
import type { Profile } from "@/lib/types";
import { useQuery as useReactQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/customers")({ component: AdminCustomers });

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function AdminCustomers() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading } = useQuery(customersQuery());
  const [selected, setSelected] = useState<Profile | null>(null);

  const toggleBlock = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => setCustomerBlocked(id, blocked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      toast.success("Customer updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const columns: Column<Profile>[] = [
    { key: "name", header: "Customer", render: (c) => (
      <button className="text-left" onClick={() => setSelected(c)}>
        <p className="font-medium text-foreground hover:underline">{c.full_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{c.email}</p>
      </button>
    ) },
    { key: "joined", header: "Joined", render: (c) => new Date(c.created_at).toLocaleDateString() },
    { key: "status", header: "Status", render: (c) => (
      <Badge variant={c.is_blocked ? "destructive" : "outline"}>{c.is_blocked ? "Blocked" : "Active"}</Badge>
    ) },
    { key: "actions", header: "", className: "text-right", render: (c) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleBlock.mutate({ id: c.id, blocked: !c.is_blocked })}
      >
        {c.is_blocked ? "Unblock" : "Block"}
      </Button>
    ) },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Customers">
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={customers} getRowId={(c) => c.id} />}
      </AdminSection>

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader><DialogTitle>{selected.full_name ?? selected.email}</DialogTitle></DialogHeader>
              <CustomerOrders userId={selected.id} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerOrders({ userId }: { userId: string }) {
  const { data: orders = [], isLoading } = useReactQuery({
    queryKey: ["my-orders", userId],
    queryFn: () => fetchMyOrders(userId),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (orders.length === 0) return <p className="text-sm text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-2 text-sm">
      {orders.map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-md border border-border p-2">
          <div>
            <p className="font-medium text-foreground">{o.order_number}</p>
            <p className="text-xs capitalize text-muted-foreground">{o.status}</p>
          </div>
          <p className="font-medium text-foreground">{CURRENCY.format(o.total)}</p>
        </div>
      ))}
    </div>
  );
}
