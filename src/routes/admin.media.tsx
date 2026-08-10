import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteMedia, uploadMedia } from "@/lib/api";
import { mediaQuery } from "@/lib/queries";
import type { MediaAsset } from "@/lib/types";

export const Route = createFileRoute("/admin/media")({ component: AdminMedia });

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AdminMedia() {
  const queryClient = useQueryClient();
  const { data: assets = [], isLoading } = useQuery(mediaQuery());
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
  }

  const upload = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map((f) => uploadMedia(f))),
    onSuccess: () => { invalidate(); toast.success("Upload complete."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed."),
  });

  const remove = useMutation({
    mutationFn: (asset: MediaAsset) => deleteMedia(asset),
    onSuccess: () => { invalidate(); toast.success("File deleted."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const filtered = assets.filter((a) =>
    a.file_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AdminSection title="Media library" description="Images used across products, categories and banners" actions={
      <div className="flex items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files" className="w-44" />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upload.mutate(files);
            e.target.value = "";
          }}
        />
        <Button disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          {upload.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Upload
        </Button>
      </div>
    }>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No media yet. Upload your first image.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((asset) => (
            <div key={asset.id} className="group overflow-hidden rounded-lg border border-border bg-card">
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={asset.url} alt={asset.alt ?? asset.file_name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="space-y-1.5 p-2.5">
                <p className="truncate text-xs font-medium text-foreground">{asset.file_name}</p>
                <p className="text-[11px] text-muted-foreground">{formatSize(asset.size_bytes)}</p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => { void navigator.clipboard.writeText(asset.url); toast.success("URL copied."); }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> URL
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { if (confirm(`Delete ${asset.file_name}?`)) remove.mutate(asset); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminSection>
  );
}
