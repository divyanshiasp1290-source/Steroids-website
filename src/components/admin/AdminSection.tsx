import type { ReactNode } from "react";

export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-border bg-surface/80 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
