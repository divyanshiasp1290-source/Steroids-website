import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadMedia } from "@/lib/api";
import { mediaQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Single image URL field with library picker + direct upload. */
export function ImagePickerField({
  value,
  onChange,
  label = "Image",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => uploadMedia(file),
    onSuccess: (asset) => {
      onChange(asset.url);
      void queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success("Image uploaded.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed."),
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                From library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Media library</DialogTitle>
              </DialogHeader>
              <MediaGridPicker
                onSelect={(url) => {
                  onChange(url);
                  setOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

/** Multi image URL list field with drag-free reordering-free simple add/remove + featured selection. */
export function MultiImagePickerField({
  values,
  onChange,
  featured,
  onFeaturedChange,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  featured?: string | null;
  onFeaturedChange?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => uploadMedia(file),
    onSuccess: (asset) => {
      onChange([...values, asset.url]);
      void queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success("Image uploaded.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed."),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {values.map((url) => (
          <div
            key={url}
            className={cn(
              "relative h-20 w-20 overflow-hidden rounded-md border-2",
              featured === url ? "border-primary" : "border-border",
            )}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== url))}
              className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            {onFeaturedChange ? (
              <button
                type="button"
                onClick={() => onFeaturedChange(url)}
                className={cn(
                  "absolute inset-x-0 bottom-0 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                  featured === url
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/80 text-foreground",
                )}
              >
                {featured === url ? "Featured" : "Set featured"}
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-accent"
        >
          {upload.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste image URL and press Add"
          className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (urlInput.trim()) {
              onChange([...values, urlInput.trim()]);
              setUrlInput("");
            }
          }}
        >
          Add URL
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              From library
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Media library</DialogTitle>
            </DialogHeader>
            <MediaGridPicker
              onSelect={(url) => {
                if (!values.includes(url)) onChange([...values, url]);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function MediaGridPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const { data, isLoading } = useQuery(mediaQuery());

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No media uploaded yet.</p>;
  }

  return (
    <div className="grid max-h-[60vh] grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6">
      {data.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onSelect(asset.url)}
          className="group aspect-square overflow-hidden rounded-md border border-border"
        >
          <img
            src={asset.url}
            alt={asset.alt ?? asset.file_name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </button>
      ))}
    </div>
  );
}
