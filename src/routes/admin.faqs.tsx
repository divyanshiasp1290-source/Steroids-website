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
import { adminFaqsQuery } from "@/lib/queries";
import type { Faq } from "@/lib/types";

export const Route = createFileRoute("/admin/faqs")({ component: AdminFaqs });

type FormState = {
  id: string | null;
  question: string;
  answer: string;
  category: string;
  position: string;
};

const EMPTY: FormState = { id: null, question: "", answer: "", category: "General", position: "0" };

function AdminFaqs() {
  const queryClient = useQueryClient();
  const { data: faqs = [], isLoading } = useQuery(adminFaqsQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    void queryClient.invalidateQueries({ queryKey: ["faqs"] });
  }

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      adminSetFlag("faqs", id, patch),
    onSuccess: () => { invalidate(); toast.success("FAQ updated."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete("faqs", id),
    onSuccess: () => { invalidate(); toast.success("FAQ deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        question: form.question,
        answer: form.answer,
        category: form.category || null,
        position: Number(form.position) || 0,
      };
      if (form.id) payload["id"] = form.id;
      return adminUpsert("faqs", payload);
    },
    onSuccess: () => { invalidate(); toast.success(form.id ? "FAQ updated." : "FAQ created."); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  const columns: Column<Faq>[] = [
    {
      key: "question", header: "Question",
      render: (f) => (
        <div className="max-w-md">
          <p className="font-medium text-foreground">{f.question}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{f.answer}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (f) => f.category ?? "General" },
    { key: "position", header: "Position", render: (f) => f.position ?? 0 },
    {
      key: "visible", header: "Visible",
      render: (f) => (
        <Switch checked={Boolean(f.is_visible)} onCheckedChange={(v) => toggle.mutate({ id: f.id, patch: { is_visible: v } })} />
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (f) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => { setForm({ id: f.id, question: f.question, answer: f.answer, category: f.category ?? "General", position: String(f.position ?? 0) }); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this FAQ?")) remove.mutate(f.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection title="FAQs" description="Answers shown on the customer support page" actions={
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New FAQ</Button>
      }>
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={faqs} getRowId={(f) => f.id} />}
      </AdminSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit FAQ" : "New FAQ"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <FormField label="Question">
              <Input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </FormField>
            <FormField label="Answer">
              <Textarea required rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category">
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </FormField>
              <FormField label="Position">
                <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </FormField>
            </div>
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
