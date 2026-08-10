export function PageHeader({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}) {
  if (image) {
    return (
<section className="relative isolate overflow-hidden border-b border-border bg-foreground">
        <img
          src={image}
          alt={imageAlt ?? ""}
          width={1920}
          height={1280}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10 hero-scrim-light"
          aria-hidden
        />
        <div className="container-page py-24 lg:py-32 lg:pt-[calc(var(--header-h)+4rem)]">
          {eyebrow ? (
            <p className="eyebrow animate-fade-up flex items-center gap-2.5 text-accent">
              <span className="inline-block h-px w-8 bg-accent" aria-hidden />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="display-xl animate-fade-up mt-6 max-w-3xl text-balance text-on-media">
            {title}
          </h1>
          {description ? (
            <p className="animate-fade-up mt-5 max-w-2xl text-pretty leading-relaxed text-on-media/75">
              {description}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-surface">
      <div className="container-page py-14 lg:py-20">
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h1 className="display-xl max-w-3xl text-balance">{title}</h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
