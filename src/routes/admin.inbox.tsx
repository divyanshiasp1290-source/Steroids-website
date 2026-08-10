import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteMessage, setMessageRead, setSubscriberActive } from "@/lib/api";
import { contactMessagesQuery, subscribersQuery } from "@/lib/queries";
import type { ContactMessage, NewsletterSubscriber } from "@/lib/types";

export const Route = createFileRoute("/admin/inbox")({ component: AdminInbox });

function AdminInbox() {
  return (
    <Tabs defaultValue="messages" className="space-y-6">
      <TabsList>
        <TabsTrigger value="messages">Contact messages</TabsTrigger>
        <TabsTrigger value="subscribers">Newsletter</TabsTrigger>
      </TabsList>
      <TabsContent value="messages"><Messages /></TabsContent>
      <TabsContent value="subscribers"><Subscribers /></TabsContent>
    </Tabs>
  );
}

function Messages() {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useQuery(contactMessagesQuery());
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
  }

  const markRead = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) => setMessageRead(id, isRead),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => { invalidate(); toast.success("Message deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const columns: Column<ContactMessage>[] = [
    { key: "from", header: "From", render: (m) => (
      <button className="text-left" onClick={() => { setSelected(m); if (!m.is_read) markRead.mutate({ id: m.id, isRead: true }); }}>
        <p className="font-medium text-foreground hover:underline">{m.name}</p>
        <p className="text-xs text-muted-foreground">{m.email}</p>
      </button>
    ) },
    { key: "subject", header: "Subject", render: (m) => (
      <div className="max-w-sm">
        <p className="text-foreground">{m.subject ?? "—"}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{m.message}</p>
      </div>
    ) },
    { key: "date", header: "Received", render: (m) => new Date(m.created_at).toLocaleDateString() },
    { key: "status", header: "Status", render: (m) => (
      <Badge variant={m.is_read ? "outline" : "default"}>{m.is_read ? "Read" : "New"}</Badge>
    ) },
    { key: "actions", header: "", className: "text-right", render: (m) => (
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="icon" onClick={() => markRead.mutate({ id: m.id, isRead: !m.is_read })}>
          <Mail className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this message?")) remove.mutate(m.id); }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ) },
  ];

  return (
    <>
      <AdminSection title="Contact messages" description="Enquiries submitted from the contact page">
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : <DataTable columns={columns} rows={messages} getRowId={(m) => m.id} />}
      </AdminSection>

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected ? (
            <>
              <DialogHeader><DialogTitle>{selected.subject ?? "Message"}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{selected.name} · {selected.email}</p>
                <p className="whitespace-pre-wrap text-foreground">{selected.message}</p>
                <a href={`mailto:${selected.email}`} className="inline-block text-sm font-medium text-primary hover:underline">
                  Reply by email
                </a>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Subscribers() {
  const queryClient = useQueryClient();
  const { data: subscribers = [], isLoading } = useQuery(subscribersQuery());

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setSubscriberActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] });
      toast.success("Subscriber updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const columns: Column<NewsletterSubscriber>[] = [
    { key: "email", header: "Email", render: (s) => <span className="font-medium text-foreground">{s.email}</span> },
    { key: "joined", header: "Subscribed", render: (s) => new Date(s.created_at).toLocaleDateString() },
    { key: "active", header: "Active", render: (s) => (
      <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, isActive: v })} />
    ) },
  ];

  return (
    <AdminSection title="Newsletter subscribers" description={`${subscribers.length} total`}>
      {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : <DataTable columns={columns} rows={subscribers} getRowId={(s) => s.id} />}
    </AdminSection>
  );
}
