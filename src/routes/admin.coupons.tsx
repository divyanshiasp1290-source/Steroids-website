import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FormField } from "@/components/admin/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminDelete, adminSetFlag, adminUpsert } from "@/lib/api";
import { couponsQuery } from "@/lib/queries";
import type { Coupon } from "@/lib/types";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });

type FormState = {
  id: string | null;
  code: string;
  description: string;
  discount_type: string;
  discount_value: string;
  min_order_amount: string;
  usage_limit: string;
  expires_at: string;
};

const EMPTY: FormState = {
  id: null, code: "", description: "", discount_type: "percentage",
  discount_value: "10", min_order_amount: "0", usage_limit: "", expires_at: "",
};

function AdminCoupons() {
  const queryClient = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery(couponsQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    void queryClient.invalidateQueries({ queryKey: ["coupons", "active"] });
  }

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      adminSetFlag("coupons", id, patch),
    onSuccess: () => { invalidate(); toast.success("Coupon updated."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete("coupons", id),
    onSuccess: () => { invalidate(); toast.success("Coupon deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        min_order_amount: Number(form.min_order_amount) || 0,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (form.id) payload["id"] = form.id;
      return adminUpsert("coupons", payload);
    },
    onSuccess: () => { invalidate(); toast.success(form.id ? "Coupon updated." : "Coupon created."); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const columns: Column<Coupon>[] = [
    {
      key: "code", header: "Code",
      render: (c) => (
        <div>
          <p className="font-mono font-medium text-foreground">{c.code}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
        </div>
      ),
    },
    {
      key: "value", header: "Discount",
      render: (c) => (c.discount_type === "percentage" ? `${c.discount_value}%` : `£${c.discount_value}`),
    },
    { key: "min", header: "Min order", render: (c) => `£${c.min_order_amount}` },
    { key: "usage", header: "Used", render: (c) => `${c.used_count}${c.usage_limit ? ` / ${c.usage_limit}` : ""}` },
    {
      key: "expiry", header: "Expires",
      render: (c) => (c.expires_at ? new Date(c.expires_at).toLocaleDateString() : <Badge variant="outline">Never</Badge>),
    },
    {
      key: "active", header: "Active",
      render: (c) => (
        <Switch checked={Boolean(c.is_active)} onCheckedChange={(v) => toggle.mutate({ id: c.id, patch: { is_active: v } })} />
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => { setForm({ id: c.id, code: c.code, description: c.description ?? "", discount_type: c.discount_type, discount_value: String(c.discount_value), min_order_amount: String(c.min_order_amount), usage_limit: c.usage_limit ? String(c.usage_limit) : "", expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "" }); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${c.code}"?`)) remove.mutate(c.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Coupons" description="Discount codes redeemable at checkout" actions={
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New coupon</Button>
      }>
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={coupons} getRowId={(c) => c.id} />}
      </AdminSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <FormField label="Code">
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </FormField>
            <FormField label="Description">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount type">
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Discount value">
                <Input type="number" step="0.01" required value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Minimum order (£)">
                <Input type="number" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              </FormField>
              <FormField label="Usage limit" hint="Leave blank for unlimited">
                <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Expiry date" hint="Leave blank for no expiry">
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
