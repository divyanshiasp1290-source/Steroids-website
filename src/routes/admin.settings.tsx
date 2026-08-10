import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { FormField } from "@/components/admin/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSetting } from "@/lib/api";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

type Group = { key: string; title: string; description: string; fields: { name: string; label: string; multiline?: boolean }[] };

const GROUPS: Group[] = [
  {
    key: "contact",
    title: "Contact details",
    description: "Used on the contact page and in the footer",
    fields: [
      { name: "email", label: "Support email" },
      { name: "phone", label: "Phone" },
      { name: "address", label: "Address", multiline: true },
      { name: "hours", label: "Opening hours" },
    ],
  },
  {
    key: "social",
    title: "Social profiles",
    description: "Links displayed in the footer",
    fields: [
      { name: "instagram", label: "Instagram URL" },
      { name: "facebook", label: "Facebook URL" },
      { name: "x", label: "X URL" },
    ],
  },
];

function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery(settingsQuery());
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, Record<string, string>> = {};
    for (const group of GROUPS) {
      const current = settings[group.key] ?? {};
      next[group.key] = Object.fromEntries(
        group.fields.map((f) => [f.name, String(current[f.name] ?? "")]),
      );
    }
    setDraft(next);
  }, [settings]);

  const save = useMutation({
    mutationFn: (key: string) => saveSetting(key, draft[key] ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-10">
      {GROUPS.map((group) => (
        <AdminSection key={group.key} title={group.title} description={group.description} actions={
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(group.key)}>
            {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save
          </Button>
        }>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = draft[group.key]?.[field.name] ?? "";
              const onChange = (v: string) =>
                setDraft((prev) => ({ ...prev, [group.key]: { ...(prev[group.key] ?? {}), [field.name]: v } }));
              return (
                <FormField key={field.name} label={field.label} className={field.multiline ? "sm:col-span-2" : ""}>
                  {field.multiline ? (
                    <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
                  ) : (
                    <Input value={value} onChange={(e) => onChange(e.target.value)} />
                  )}
                </FormField>
              );
            })}
          </div>
        </AdminSection>
      ))}
    </div>
  );
}
