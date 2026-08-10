import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Rating } from "@/components/ui-kit/Rating";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { categoriesQuery } from "@/lib/queries";
import type { ProductSort } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ShopFilterState = {
  q: string;
  categories: string[];
  price: [number, number];
  inStockOnly: boolean;
  minRating: number;
  sort: ProductSort;
};

export const PRICE_CEILING = 2000;

export const defaultFilters: ShopFilterState = {
  q: "",
  categories: [],
  price: [0, PRICE_CEILING],
  inStockOnly: false,
  minRating: 0,
  sort: "newest",
};

export function FilterSidebar({
  value,
  onChange,
  onClose,
}: {
  value: ShopFilterState;
  onChange: (next: ShopFilterState) => void;
  onClose?: () => void;
}) {
  const categories = useQuery(categoriesQuery());

  const toggle = (key: "categories", slug: string) => {
    const list = value[key];
    onChange({
      ...value,
      [key]: list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug],
    });
  };

  return (
    <div className="flex h-full flex-col">
      {onClose ? (
        <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:hidden">
          <span className="font-display text-xl">Filters</span>
          <button type="button" onClick={onClose} aria-label="Close filters">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="flex-1 space-y-10 overflow-y-auto p-5 lg:p-0">
        <Group title="Search">
          <input
            value={value.q}
            onChange={(event) => onChange({ ...value, q: event.target.value })}
            placeholder="Search products"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </Group>

        <Group title="Categories">
          {categories.isLoading ? (
            <SkeletonList />
          ) : categories.data && categories.data.length > 0 ? (
            <ul className="space-y-3">
              {categories.data.map((category) => (
                <li key={category.id}>
                  <CheckRow
                    checked={value.categories.includes(category.slug)}
                    onChange={() => toggle("categories", category.slug)}
                    label={category.name}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Muted>Categories load from your catalogue.</Muted>
          )}
        </Group>

        <Group title="Price range">
          <Slider
            value={value.price}
            min={0}
            max={PRICE_CEILING}
            step={10}
            onValueChange={(next) => onChange({ ...value, price: [next[0]!, next[1]!] })}
          />
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>£{value.price[0]}</span>
            <span>£{value.price[1]}{value.price[1] === PRICE_CEILING ? "+" : ""}</span>
          </div>
        </Group>

        <Group title="Availability">
          <CheckRow
            checked={value.inStockOnly}
            onChange={() => onChange({ ...value, inStockOnly: !value.inStockOnly })}
            label="In stock only"
          />
        </Group>

        <Group title="Rating">
          <ul className="space-y-2.5">
            {[4, 3, 2, 0].map((rating) => (
              <li key={rating}>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, minRating: rating })}
                  className={cn(
                    "flex w-full items-center gap-3 text-left text-sm transition-colors",
                    value.minRating === rating ? "text-accent" : "hover:text-accent",
                  )}
                >
                  {rating === 0 ? (
                    <span className="text-sm">All ratings</span>
                  ) : (
                    <>
                      <Rating value={rating} />
                      <span className="text-xs text-muted-foreground">& up</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Group>

        <button
          type="button"
          onClick={() => onChange({ ...defaultFilters })}
          className="w-full border border-border py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="label-caps mb-4 text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} className="rounded-none" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shimmer h-3.5 w-2/3 rounded-sm" />
      ))}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
