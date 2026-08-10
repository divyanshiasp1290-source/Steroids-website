import { PageHeader } from "@/components/layout/PageHeader";

export type PolicySection = { heading: string; body: string[] };

export function PolicyPage({
  eyebrow,
  title,
  description,
  updated,
  sections,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  sections: PolicySection[];
  image?: string;
  imageAlt?: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} image={image} imageAlt={imageAlt} />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <p className="label-caps">Last updated</p>
          <p className="mt-1 text-sm text-muted-foreground">{updated}</p>
          <nav className="mt-8 hidden space-y-2.5 lg:block">
            {sections.map((section, index) => (
              <a
                key={section.heading}
                href={`#section-${index}`}
                className="block text-sm text-muted-foreground transition-colors hover:text-accent"
              >
                {section.heading}
              </a>
            ))}
          </nav>
        </aside>

        <div className="max-w-2xl">
          {sections.map((section, index) => (
            <section key={section.heading} id={`section-${index}`} className="mb-12 scroll-mt-32">
              <h2 className="font-display text-2xl">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
