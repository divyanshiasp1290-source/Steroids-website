import { Link } from "@tanstack/react-router";
import { Clock, PhoneCall, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { NewsletterForm } from "@/components/marketing/NewsletterForm";
import { bannersQuery } from "@/lib/queries";

const COLUMNS = [
  {
    title: "Shop",
links: [
      { label: "All products", to: "/shop" as const },
      { label: "Wishlist", to: "/wishlist" as const },
      { label: "Basket", to: "/cart" as const },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "/about" as const },
      { label: "Contact", to: "/contact" as const },
      { label: "FAQ", to: "/faq" as const },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Shipping policy", to: "/shipping-policy" as const },
      { label: "Refund policy", to: "/refund-policy" as const },
      { label: "Terms & conditions", to: "/terms" as const },
      { label: "Privacy policy", to: "/privacy-policy" as const },
    ],
  },
];

const ASSURANCES = [
  { icon: ShieldCheck, label: "Third-party lab tested" },
  { icon: Clock, label: "Same-day UK dispatch" },
  { icon: PhoneCall, label: "Support 7 days a week" },
];

export function Footer() {
  const { data: footerBanners = [] } = useQuery(bannersQuery("footer"));

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      {/* Optional footer banners inserted here */}
      {footerBanners.length > 0 ? (
        <div className="container-page py-8">
          <div className="grid gap-4">
            {footerBanners.map((b) => (
              <a
                key={b.id}
                href={b.cta_url ?? "#"}
                className="block overflow-hidden rounded-md border border-border bg-card"
                target={b.cta_url ? undefined : "_self"}
                rel={b.cta_url ? "noopener noreferrer" : undefined}
              >
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title ?? ""} className="h-36 w-full object-cover" />
                ) : (
                  <div className="p-6">
                    <h4 className="font-display text-lg">{b.title}</h4>
                    <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="container-page grid gap-6 border-b border-border py-8 sm:grid-cols-3">
        {ASSURANCES.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="container-page grid gap-14 py-16 lg:grid-cols-[1.4fr_2fr] lg:py-20">
        <div className="max-w-sm">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
            Helix<span className="text-accent">Pharma</span>
          </Link>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            A UK supplier of pharmacy-grade medication and performance support. Every batch is
            independently tested and dispatched in discreet, tamper-proof packaging.
          </p>
          <div className="mt-8">
            <p className="label-caps mb-3">Health updates & restocks</p>
            <NewsletterForm variant="inline" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="label-caps mb-5">{column.title}</h4>
              <ul className="space-y-3.5 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="transition-colors hover:text-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            © {new Date().getFullYear()} Helix Pharma UK. All rights reserved.
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Ships from the UK · GBP · Not medical advice
          </p>
        </div>
      </div>
    </footer>
  );
}
