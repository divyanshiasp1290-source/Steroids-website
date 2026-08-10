import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FlaskConical, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import aboutFacility from "@/assets/about-facility.jpg";
import { NewsletterSection } from "@/components/marketing/NewsletterSection";
import { pageQuery } from "@/lib/queries";

const title = "About Helix Pharma UK — Lab-Verified Medicine Supply";
const description =
  "How we source, test and dispatch pharmacy-grade medication from our Manchester facility.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const STATS = [
  ["2019", "Founded in Manchester"],
  ["19k+", "Orders dispatched"],
  ["100%", "Batches lab assayed"],
  ["4.9/5", "Average customer score"],
] as const;

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Licensed sources only",
    body: "We buy from GMP-licensed manufacturers and audit each supply line before a product is listed.",
  },
  {
    icon: FlaskConical,
    title: "Tested, then published",
    body: "Every batch is assayed by an independent UK laboratory and the report is published against the batch code.",
  },
  {
    icon: PackageCheck,
    title: "Discreet by default",
    body: "Plain outer packaging, neutral card descriptors and tamper-proof seals on every parcel.",
  },
  {
    icon: Truck,
    title: "Dispatched same day",
    body: "Orders placed before 3pm leave our Manchester unit the same working day on a tracked service.",
  },
];

const PROCESS = [
  {
    step: "01",
    title: "Source",
    body: "Shortlisted GMP-licensed manufacturers, each audited on documentation, facility standards and traceability.",
  },
  {
    step: "02",
    title: "Assay",
    body: "Samples from every inbound batch go to an independent UK lab for identity, potency and contamination testing.",
  },
  {
    step: "03",
    title: "Release",
    body: "Batches outside a five percent tolerance are rejected outright — never relabelled, never discounted.",
  },
  {
    step: "04",
    title: "Dispatch",
    body: "Picked, sealed and shipped in plain packaging with tracked delivery and seven-day support.",
  },
];

function About() {
  const { data: page } = useQuery(pageQuery("about"));

  return (
    <>
{/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border bg-foreground">
        <img
          src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1920&q=80"
          alt="A scientist in a clean laboratory inspecting pharmaceutical samples"
          width={1920}
          height={1280}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
<div className="absolute inset-0 -z-10 hero-scrim-light" aria-hidden />
        <div className="container-page py-14 lg:py-20 lg:pt-[calc(var(--header-h)+2rem)]">
          <p className="eyebrow animate-fade-up flex items-center gap-2.5 text-accent">
            <span className="inline-block h-px w-8 bg-accent" aria-hidden />
            Our practice
          </p>
          <h1 className="display-lg animate-fade-up mt-5 max-w-3xl text-balance text-on-media">
            {page?.title ?? "A supply chain you can actually verify."}
          </h1>
          <p className="animate-fade-up mt-4 max-w-2xl text-pretty leading-relaxed text-on-media/75">
            {page?.subtitle ??
              "Helix Pharma UK was founded by pharmacists tired of unverifiable products and vague sourcing claims. We keep the catalogue small so every batch can be tracked end to end."}
          </p>
          <div className="animate-fade-up mt-7 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              Browse the catalogue
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full border border-on-media/30 px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-media backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-on-media/60 hover:bg-on-media/10"
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="container-page grid grid-cols-2 gap-8 py-12 lg:grid-cols-4 lg:py-14">
          {STATS.map(([value, label]) => (
            <div key={label} className="min-w-0">
              <p className="font-display text-3xl font-semibold lg:text-4xl">{value}</p>
              <p className="label-caps mt-2 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="container-page section-y grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="min-w-0">
          <img
            src={aboutFacility}
            alt="Discreet parcels being sealed at the Helix Pharma UK fulfilment unit"
            width={1008}
            height={1200}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-2xl object-cover"
          />
        </div>
        <div className="min-w-0 lg:pt-4">
          <p className="label-caps">Est. 2019 · Manchester, UK</p>
          <h2 className="display-lg mt-4 text-balance">Fewer products, fully documented.</h2>
          <div className="mt-8 max-w-2xl space-y-6 leading-relaxed text-muted-foreground">
            {page?.content ? (
              page.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <>
                <p>
                  We work with a short list of GMP-licensed manufacturers. Every supply line is
                  audited before a product is listed, and we deliberately keep the catalogue small
                  so that each batch can be tracked end to end.
                </p>
                <p>
                  Finished stock is sampled and sent to an independent UK laboratory for identity,
                  potency and contamination testing. Batches outside a five percent tolerance are
                  rejected, never relabelled or discounted.
                </p>
                <p>
                  Orders are picked, sealed and dispatched from our Manchester unit in plain
                  packaging, with tracked delivery and a care team available seven days a week.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-border bg-surface">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">What we stand on</p>
            <h2 className="display-lg text-balance">Four commitments, no exceptions.</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="group rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lift"
              >
                <pillar.icon
                  className="h-6 w-6 text-accent transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.6}
                />
                <h3 className="mt-6 font-display text-lg leading-snug">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="container-page section-y">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">How a product reaches you</p>
          <h2 className="display-lg text-balance">From manufacturer to doorstep.</h2>
        </div>
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((item) => (
            <li key={item.step} className="border-t border-border pt-6">
              <span className="font-display text-sm font-semibold text-accent">{item.step}</span>
              <h3 className="mt-3 font-display text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

{/* CTA */}
      <section className="container-page pb-16">
        <div className="grid items-center gap-8 rounded-3xl bg-primary px-8 py-14 text-primary-foreground sm:px-14 lg:grid-cols-[1.4fr_auto]">
          <div className="min-w-0">
            <h2 className="display-lg text-balance">Questions before you order?</h2>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-primary-foreground/70">
              Our care team answers sourcing, dosage-documentation and delivery questions seven days
              a week.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 justify-self-start rounded-full bg-accent px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-foreground transition-transform duration-300 hover:-translate-y-0.5 lg:justify-self-end"
          >
            Contact us
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
