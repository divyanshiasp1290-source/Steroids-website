import { FlaskConical, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { SectionHeader } from "@/components/ui-kit/SectionHeader";

const PILLARS = [
  {
    icon: FlaskConical,
    title: "Independently lab tested",
    body: "Every batch is analysed by a third-party laboratory for purity and dosage accuracy before it is listed.",
  },
  {
    icon: PackageCheck,
    title: "Sealed & tamper-proof",
    body: "Products arrive factory sealed with batch codes you can verify against our published reports.",
  },
  {
    icon: Truck,
    title: "Discreet UK delivery",
    body: "Tracked, plain packaging with same-day dispatch on orders placed before 3pm. Free over £100.",
  },
  {
    icon: ShieldCheck,
    title: "Support that answers",
    body: "A UK-based care team seven days a week for dosing questions, tracking and returns.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="container-page section-y">
      <SectionHeader
        eyebrow="Why Helix Pharma UK"
        title="Clinical standards, from order to doorstep"
        align="center"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="flex h-full flex-col rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
              <pillar.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-6 font-display text-lg font-semibold">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
