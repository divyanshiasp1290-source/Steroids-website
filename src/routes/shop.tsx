import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/products/ProductCard";
import { QuickViewDialog } from "@/components/products/QuickViewDialog";
import {
  defaultFilters,
  FilterSidebar,
  PRICE_CEILING,
  type ShopFilterState,
} from "@/components/shop/FilterSidebar";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { ProductGridSkeleton } from "@/components/ui-kit/Skeletons";
import { productsQuery } from "@/lib/queries";
import type { Product, ProductFilters, ProductSort } from "@/lib/types";

const title = "Shop All Medicines — Helix Pharma UK";
const description =
  "Filter the full Helix Pharma catalogue by category, price, availability and customer rating.";

type ShopSearch = {
  q?: string | undefined;
  category?: string | undefined;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ShopPage,
});

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Alphabetical" },
];

const PER_PAGE = 12;

function ShopPage() {
  const search = Route.useSearch();
  const [filters, setFilters] = useState<ShopFilterState>({
    ...defaultFilters,
    q: search.q ?? "",
    categories: search.category ? [search.category] : [],
  });
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      q: search.q ?? "",
      categories: search.category ? [search.category] : current.categories,
    }));
    setPage(1);
  }, [search.q, search.category]);

  const apiFilters = useMemo<ProductFilters>(
    () => ({
      search: filters.q || undefined,
      categories: filters.categories.length ? filters.categories : undefined,
      minPrice: filters.price[0] > 0 ? filters.price[0] : undefined,
      maxPrice: filters.price[1] < PRICE_CEILING ? filters.price[1] : undefined,
      inStockOnly: filters.inStockOnly || undefined,
      minRating: filters.minRating || undefined,
      sort: filters.sort,
      page,
      perPage: PER_PAGE,
    }),
    [filters, page],
  );

  const { data, isLoading, isFetching } = useQuery(productsQuery(apiFilters));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;

  const updateFilters = (next: ShopFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <>
<PageHeader
        eyebrow="The catalogue"
        title="Shop all medicines"
        description="Every treatment we stock — filter by category, price, availability and rating."
        image="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1920&q=80"
        imageAlt="Neatly arranged amber medicine vials and blister packs on a clean clinical shelf"
      />

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14 lg:py-16">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <FilterSidebar value={filters} onChange={updateFilters} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-4">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {isLoading ? "Loading products…" : `${data?.total ?? 0} products`}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </button>
              <select
                value={filters.sort}
                onChange={(event) =>
                  updateFilters({ ...filters, sort: event.target.value as ProductSort })
                }
                className="border border-border bg-background px-3 py-2 text-xs outline-none"
                aria-label="Sort products"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading || isFetching ? (
            <ProductGridSkeleton count={10} />
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7 xl:grid-cols-5">
                {data.items.map((product) => (
                  <ProductCard key={product.id} product={product} onQuickView={setQuickView} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-16 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPage(index + 1)}
                      className={
                        page === index + 1
                          ? "h-9 w-9 bg-primary text-xs text-primary-foreground"
                          : "h-9 w-9 border border-border text-xs transition-colors hover:bg-secondary"
                      }
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState title="No products match" />
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-background shadow-lift">
            <FilterSidebar
              value={filters}
              onChange={updateFilters}
              onClose={() => setDrawerOpen(false)}
            />
            <div className="border-t border-border p-5">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-primary py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <QuickViewDialog product={quickView} onOpenChange={(open) => !open && setQuickView(null)} />
    </>
  );
}
