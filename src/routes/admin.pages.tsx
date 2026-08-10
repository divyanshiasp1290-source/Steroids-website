import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FormField } from "@/components/admin/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminDelete, adminSetFlag, adminUpsert } from "@/lib/api";
import { pagesQuery } from "@/lib/queries";
import type { SitePage } from "@/lib/types";

export const Route = createFileRoute("/admin/pages")({ component: AdminPages });

type FormState = {
  id: string | null;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  seo_title: string;
  meta_description: string;
};

const EMPTY: FormState = {
  id: null, slug: "", title: "", subtitle: "", content: "", seo_title: "", meta_description: "",
};

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminPages() {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading } = useQuery(pagesQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["pages"] });
    void queryClient.invalidateQueries({ queryKey: ["page"] });
  }

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      adminSetFlag("pages", id, patch),
    onSuccess: () => { invalidate(); toast.success("Page updated."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete("pages", id),
    onSuccess: () => { invalidate(); toast.success("Page deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        slug: form.slug || slugify(form.title),
        title: form.title,
        subtitle: form.subtitle || null,
        content: form.content || null,
        seo_title: form.seo_title || null,
        meta_description: form.meta_description || null,
      };
      if (form.id) payload["id"] = form.id;
      return adminUpsert("pages", payload);
    },
    onSuccess: () => { invalidate(); toast.success(form.id ? "Page updated." : "Page created."); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const columns: Column<SitePage>[] = [
    {
      key: "title", header: "Page",
      render: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.title}</p>
          <p className="text-xs text-muted-foreground">/{p.slug}</p>
        </div>
      ),
    },
    {
      key: "updated", header: "Updated",
      render: (p) => (p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"),
    },
    {
      key: "published", header: "Published",
      render: (p) => (
        <Switch checked={Boolean(p.is_published)} onCheckedChange={(v) => toggle.mutate({ id: p.id, patch: { is_published: v } })} />
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => { setForm({ id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle ?? "", content: p.content ?? "", seo_title: p.seo_title ?? "", meta_description: p.meta_description ?? "" }); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="Content pages" description="Policy and information pages served to the storefront" actions={
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New page</Button>
      }>
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={pages} getRowId={(p) => p.id} />}
      </AdminSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit page" : "New page"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Title">
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} />
              </FormField>
              <FormField label="Slug">
                <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Subtitle">
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </FormField>
            <FormField label="Content" hint="Plain text paragraphs">
              <Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </FormField>
            <FormField label="SEO title">
              <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
            </FormField>
            <FormField label="Meta description">
              <Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
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
