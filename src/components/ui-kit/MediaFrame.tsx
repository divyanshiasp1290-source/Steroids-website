import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Uniform product/editorial imagery. Every product image in the store uses the
 * same 4:5 frame so cards stay perfectly equal height.
 */
export function MediaFrame({
  src,
  alt,
  ratio = "aspect-[4/5]",
  className,
  imgClassName,
  hoverZoom = false,
  loading = "lazy",
}: {
  src?: string | null | undefined;
  alt: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  hoverZoom?: boolean;
  loading?: "lazy" | "eager";
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface", ratio, className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={cn(
            "h-full w-full object-cover",
            hoverZoom &&
              "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.04]",
            imgClassName,
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
