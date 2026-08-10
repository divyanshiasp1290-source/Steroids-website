import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { faqsQuery } from "@/lib/queries";

const title = "Frequently Asked Questions — Helix Pharma UK";
const description =
  "Answers on shipping, returns, guarantees, materials and care for Helix Pharma UK orders.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { data, isLoading } = useQuery(faqsQuery());
  const faqs = data ?? [];
  const groups = Array.from(new Set(faqs.map((faq) => faq.category ?? "General")));

  return (
    <>
<PageHeader
        eyebrow="Support"
        title="Questions, answered."
        description="If you can't find what you need here, our client care team replies within one business day."
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1920&q=80"
        imageAlt="A pen resting on a neatly written checklist beside an open notebook"
      />

      <section className="container-page section-y grid gap-14 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20">
        <aside className="h-fit lg:sticky lg:top-32">
          <p className="label-caps">Still stuck?</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Write to us and a real person will answer — no ticket queues.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-block border border-border px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
          >
            Contact us
          </Link>
        </aside>

        <div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading questions…</p>
          ) : faqs.length === 0 ? (
            <EmptyState title="No questions published yet" />
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-12">
                <h2 className="label-caps mb-4">{group}</h2>
                <Accordion type="single" collapsible className="border-t border-border">
                  {faqs
                    .filter((faq) => (faq.category ?? "General") === group)
                    .map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left font-display text-lg">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
