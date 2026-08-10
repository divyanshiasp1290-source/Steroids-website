import { PackageOpen } from "lucide-react";

import { isBackendConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon: Icon = PackageOpen,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const notConnected = !isBackendConfigured;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground" />
      <h3 className="mt-5 font-display text-2xl">
        {title ?? (notConnected ? "Awaiting your catalogue" : "Nothing here yet")}
      </h3>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        {description ??
          (notConnected
            ? "This storefront is wired to a live database. Add your project keys and this section fills with real data — no placeholders."
            : "There is no content to show for this selection right now.")}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
