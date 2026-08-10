import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, FlaskConical, ShieldCheck, Truck } from "lucide-react";

import heroImage from "@/assets/hero.jpg";

const STATS = [
  ["100%", "Batch tested"],
  ["24h", "UK dispatch"],
  ["4.9", "Customer rating"],
] as const;

const MARKERS = [
  { icon: ShieldCheck, label: "Licensed manufacturers" },
  { icon: FlaskConical, label: "Independent lab assays" },
  { icon: Truck, label: "Plain, tracked delivery" },
] as const;

export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-foreground">
      <img
        src={heroImage}
        alt="Amber medicine vials, blister packs and a sealed pharmaceutical carton under clinical teal light"
        width={1920}
        height={1280}
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,oklch(0.14_0.02_240/0.94)_0%,oklch(0.14_0.02_240/0.82)_42%,oklch(0.14_0.02_240/0.45)_70%,oklch(0.14_0.02_240/0.35)_100%)]"
        aria-hidden
      />

      <div className="container-page flex min-h-[100svh] flex-col justify-end pb-16 pt-[calc(var(--header-h)+3rem)] text-on-media lg:justify-center lg:pb-28">
        <p className="eyebrow animate-fade-up flex items-center gap-2.5 text-on-media/70">
          <span className="inline-block h-px w-8 bg-accent" aria-hidden />
          UK stocked · Lab verified · Discreet delivery
        </p>

        <h1 className="display-xl animate-fade-up mt-7 max-w-4xl text-balance leading-[0.98]">
          Pharmacy-grade medicine,
          <span className="block text-accent">verified batch by batch.</span>
        </h1>

        <p className="animate-fade-up mt-8 max-w-xl text-pretty text-base leading-relaxed text-on-media/75">
          Oral and injectable treatments, post-cycle support, peptides and wellness essentials —
          sourced from licensed manufacturers, third-party tested and shipped from the UK in plain
          packaging.
        </p>

        <div className="animate-fade-up mt-11 flex flex-wrap gap-3">
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-foreground shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
          >
            Shop all products
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/faq"
            className="inline-flex items-center rounded-full border border-on-media/30 px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-media backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-on-media/60 hover:bg-on-media/10"
          >
            How ordering works
          </Link>
        </div>

        <ul className="animate-fade-up mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {MARKERS.map((marker) => (
            <li
              key={marker.label}
              className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-on-media/60"
            >
              <marker.icon className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
              {marker.label}
            </li>
          ))}
        </ul>

        <dl className="animate-fade-up mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-on-media/15 pt-8">
          {STATS.map(([value, label]) => (
            <div key={label}>
              <dt className="font-display text-3xl font-semibold lg:text-4xl">{value}</dt>
              <dd className="label-caps mt-1.5 text-on-media/55">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <a
        href="#collection"
        aria-label="Scroll to categories"
        className="absolute bottom-8 right-5 hidden h-11 w-11 place-items-center rounded-full border border-on-media/25 text-on-media transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground lg:grid lg:right-10"
      >
        <ArrowDown className="h-4 w-4" />
      </a>
    </section>
  );
}
