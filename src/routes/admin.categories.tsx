import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FormField } from "@/components/admin/FormField";
import { ImagePickerField } from "@/components/admin/ImagePicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminDelete, adminSetFlag, adminUpsert } from "@/lib/api";
import { adminCategoriesQuery } from "@/lib/queries";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  sort_order: string;
};

const EMPTY: FormState = { id: null, name: "", slug: "", description: "", image_url: null, sort_order: "0" };

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery(adminCategoriesQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      adminSetFlag("categories", id, patch),
    onSuccess: () => { invalidate(); toast.success("Category updated."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete("categories", id),
    onSuccess: () => { invalidate(); toast.success("Category deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        image_url: form.image_url,
        sort_order: Number(form.sort_order) || 0,
      };
      if (form.id) payload["id"] = form.id;
      return adminUpsert("categories", payload);
    },
    onSuccess: () => { invalidate(); toast.success(form.id ? "Category updated." : "Category created."); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const columns: Column<Category>[] = [
    {
      key: "name", header: "Category",
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.image_url ? <img src={c.image_url} alt="" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
          <div>
            <p className="font-medium text-foreground">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "sort", header: "Sort order", render: (c) => c.sort_order ?? 0 },
    {
      key: "visible", header: "Visible",
      render: (c) => (
        <Switch checked={Boolean(c.is_visible)} onCheckedChange={(v) => toggle.mutate({ id: c.id, patch: { is_visible: v } })} />
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => { setForm({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image_url: c.image_url, sort_order: String(c.sort_order ?? 0) }); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Categories" description="Organize your catalogue" actions={
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New category</Button>
      }>
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={categories} getRowId={(c) => c.id} />}
      </AdminSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <FormField label="Name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} />
            </FormField>
            <FormField label="Slug">
              <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </FormField>
            <FormField label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <FormField label="Sort order">
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </FormField>
            <ImagePickerField label="Image" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
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
