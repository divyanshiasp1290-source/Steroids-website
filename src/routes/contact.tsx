import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import contactBanner from "@/assets/about-facility.jpg";
import { sendContactMessage } from "@/lib/api";
import { settingsQuery, bannersQuery } from "@/lib/queries";


const title = "Contact Helix Pharma UK — Client Care & Enquiries";
const description =
  "Reach the Helix Pharma UK client care team for orders, sourcing requests, press and wholesale enquiries.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Contact,
});

const FALLBACK = {
  email: "care@helixpharma.co.uk",
  phone: "+44 161 555 0142",
  address: "Unit 12 Trafford Point, Manchester M17 1AB, United Kingdom",
  hours: "Mon–Sun, 8am–8pm",
};

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const { data: settings } = useQuery(settingsQuery());
  const contact = { ...FALLBACK, ...(settings?.["contact"] ?? {}) } as typeof FALLBACK;
  const { data: heroBanners = [] } = useQuery(bannersQuery("contact-hero"));
  const heroImage = heroBanners.length > 0 ? heroBanners[0].image_url : contactBanner;

  const details = [
    { icon: Mail, label: "Client care", value: contact.email },
    { icon: Phone, label: "Telephone", value: contact.phone },
    { icon: MapPin, label: "Dispatch hub", value: contact.address },
  ];


  const mutation = useMutation({
    mutationFn: () => sendContactMessage(form),
    onSuccess: () => {
      toast.success("Message sent — we reply within one business day.");
      setForm({ name: "", email: "", subject: "", message: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const field =
    "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title="Talk to the house."
        description="Orders, sourcing requests, press and wholesale — one team answers all of it."
        image={heroImage}
        imageAlt="Bright facility environment with medical products and staff workspace"
      />

      <section className="container-page section-y grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
        <div className="space-y-8">
          {details.map((detail) => (
            <div key={detail.label} className="flex gap-4 border-t border-border pt-6">
              <detail.icon className="mt-1 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="label-caps">{detail.label}</p>
                <p className="mt-1 text-sm">{detail.value}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-6">
            <p className="label-caps">Hours</p>
            <p className="mt-1 text-sm text-muted-foreground">{contact.hours}</p>
          </div>
        </div>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
          />
          <input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={field}
          />
          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className={`${field} sm:col-span-2`}
          />
          <textarea
            required
            rows={7}
            placeholder="How can we help?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={`${field} sm:col-span-2`}
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
          >
            {mutation.isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      </section>
    </>
  );
}
