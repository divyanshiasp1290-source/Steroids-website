import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number | null | undefined;
  count?: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const rating = value ?? 0;
  const px = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              px,
              i <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-muted-foreground/40",
            )}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {count !== undefined && count !== null ? (
        <span className="text-xs text-muted-foreground">({count})</span>
      ) : null}
    </div>
  );
}
