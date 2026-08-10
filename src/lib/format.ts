export function formatPrice(value: number | null | undefined, currency = "GBP") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function stockLabel(stock: number) {
  if (stock <= 0) return { label: "Sold out", tone: "muted" as const };
  if (stock <= 5) return { label: `Only ${stock} left`, tone: "accent" as const };
  return { label: "In stock", tone: "success" as const };
}
