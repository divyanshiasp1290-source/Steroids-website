import { NewsletterForm } from "@/components/marketing/NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container-page section-y flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
          The dispatch
        </p>
        <h2 className="display-lg mt-4 max-w-2xl text-balance">
          Private previews, restocks and slow-made stories
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-primary-foreground/70">
          One considered letter a month. New arrivals before they go public, maker interviews, and
          restock alerts and new lab reports.
        </p>
        <div className="mt-10 w-full max-w-md">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
