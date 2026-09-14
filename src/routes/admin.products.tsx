import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FormField } from "@/components/admin/FormField";
import { MultiImagePickerField } from "@/components/admin/ImagePicker";
import { MediaFrame } from "@/components/ui-kit/MediaFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { adminDelete, adminSetFlag, adminUpsert } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { adminCategoriesQuery, adminProductsQuery } from "@/lib/queries";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type SpecEntry = { key: string; value: string };

type ProductFormState = {
  id: string | null;
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  short_description: string;
  description: string;
  benefits: string;
  ingredients: string;
  usage: string;
  specifications: SpecEntry[];
  price: string;
  compare_at_price: string;
  stock: string;
  low_stock_threshold: string;
  seo_title: string;
  meta_description: string;
  images: string[];
  featured_image: string | null;
};

const EMPTY_FORM: ProductFormState = {
  id: null,
  name: "",
  slug: "",
  sku: "",
  category_id: "",
  short_description: "",
  description: "",
  benefits: "",
  ingredients: "",
  usage: "",
  specifications: [],
  price: "",
  compare_at_price: "",
  stock: "0",
  low_stock_threshold: "5",
  seo_title: "",
  meta_description: "",
  images: [],
  featured_image: null,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toFormState(product: Product): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    category_id: product.category_id ?? "",
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    benefits: (product.benefits ?? []).join("\n"),
    ingredients: product.ingredients ?? "",
    usage: product.usage ?? "",
    specifications: Object.entries(product.specifications ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
    price: String(product.price ?? ""),
    compare_at_price: product.compare_at_price != null ? String(product.compare_at_price) : "",
    stock: String(product.stock ?? 0),
    low_stock_threshold:
      product.low_stock_threshold != null ? String(product.low_stock_threshold) : "5",
    seo_title: product.seo_title ?? "",
    meta_description: product.meta_description ?? "",
    images: product.images ?? [],
    featured_image: product.images?.[0] ?? null,
  };
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery(adminProductsQuery());
  const { data: categories = [] } = useQuery(adminCategoriesQuery());

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const stockCounts = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const p of products) {
      const stock = p.stock ?? 0;
      const threshold = p.low_stock_threshold ?? 5;
      if (stock <= 0) {
        outOfStock++;
      } else {
        inStock++;
        if (stock <= threshold) {
          lowStock++;
        }
      }
    }

    return {
      all: products.length,
      in_stock: inStock,
      low_stock: lowStock,
      out_of_stock: outOfStock,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (term) {
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesSku = (p.sku ?? "").toLowerCase().includes(term);
        if (!matchesName && !matchesSku) return false;
      }

      const stock = p.stock ?? 0;
      const threshold = p.low_stock_threshold ?? 5;

      if (stockFilter === "in_stock" && stock <= 0) return false;
      if (stockFilter === "low_stock" && (stock <= 0 || stock > threshold)) return false;
      if (stockFilter === "out_of_stock" && stock > 0) return false;

      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;

      return true;
    });
  }, [products, search, stockFilter, categoryFilter]);

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["collection"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  }

  const toggleFlag = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      adminSetFlag("products", id, patch),
    onSuccess: () => {
      invalidateAll();
      toast.success("Product updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const removeProduct = useMutation({
    mutationFn: (id: string) => adminDelete("products", id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Product deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      const specifications = Object.fromEntries(
        form.specifications.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value]),
      );
      const images = form.featured_image
        ? [form.featured_image, ...form.images.filter((i) => i !== form.featured_image)]
        : form.images;
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        sku: form.sku || null,
        category_id: form.category_id || null,
        short_description: form.short_description || null,
        description: form.description || null,
        benefits: form.benefits
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
        ingredients: form.ingredients || null,
        usage: form.usage || null,
        specifications,
        price: Number(form.price) || 0,
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        stock: Number(form.stock) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
        seo_title: form.seo_title || null,
        meta_description: form.meta_description || null,
        images,
      };
      if (form.id) payload["id"] = form.id;
      return adminUpsert("products", payload);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(form.id ? "Product updated." : "Product created.");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed."),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setForm(toFormState(product));
    setDialogOpen(true);
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <MediaFrame
            src={p.images?.[0]}
            alt={p.name}
            ratio="aspect-square"
            className="h-10 w-10 shrink-0 rounded-md"
          />
          <div>
            <p className="font-medium text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.sku ?? p.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (p) => p.category?.name ?? "—",
    },
    {
      key: "price",
      header: "Price",
      render: (p) => formatPrice(p.price, p.currency ?? "GBP"),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        const stock = p.stock ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        const isOut = stock <= 0;
        const isLow = !isOut && stock <= threshold;

        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant={isOut ? "destructive" : "outline"}
              className={
                isLow
                  ? "border-amber-500/40 bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400"
                  : ""
              }
            >
              {stock}
            </Badge>
            {isLow && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Low
              </span>
            )}
            {isOut && (
              <span className="text-[11px] font-medium text-destructive">
                Out
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "published",
      header: "Published",
      render: (p) => (
        <Switch
          checked={Boolean(p.is_published)}
          onCheckedChange={(checked) =>
            toggleFlag.mutate({ id: p.id, patch: { is_published: checked } })
          }
        />
      ),
    },
    {
      key: "flags",
      header: "Flags",
      render: (p) => (
        <div className="flex flex-wrap gap-1.5">
          <FlagToggle
            label="Featured"
            checked={Boolean(p.is_featured)}
            onChange={(v) => toggleFlag.mutate({ id: p.id, patch: { is_featured: v } })}
          />
          <FlagToggle
            label="Best seller"
            checked={Boolean(p.is_best_seller)}
            onChange={(v) => toggleFlag.mutate({ id: p.id, patch: { is_best_seller: v } })}
          />
          <FlagToggle
            label="New"
            checked={Boolean(p.is_new_arrival)}
            onChange={(v) => toggleFlag.mutate({ id: p.id, patch: { is_new_arrival: v } })}
          />
          <FlagToggle
            label="Trending"
            checked={Boolean(p.is_trending)}
            onChange={(v) => toggleFlag.mutate({ id: p.id, patch: { is_trending: v } })}
          />
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Delete "${p.name}"?`)) removeProduct.mutate(p.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminSection
        title="Products"
        description="Manage your catalogue"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New product
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={stockFilter}
              onValueChange={(v) => setStockFilter(v as StockFilter)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto">
                <TabsTrigger value="all" className="gap-1.5 px-3 py-1.5 text-xs">
                  All
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {stockCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="in_stock" className="gap-1.5 px-3 py-1.5 text-xs">
                  In stock
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {stockCounts.in_stock}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="low_stock" className="gap-1.5 px-3 py-1.5 text-xs">
                  Low stock
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                  >
                    {stockCounts.low_stock}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="out_of_stock" className="gap-1.5 px-3 py-1.5 text-xs">
                  Out of stock
                  <Badge
                    variant="secondary"
                    className="bg-destructive/15 px-1.5 py-0 text-[10px] font-medium text-destructive"
                  >
                    {stockCounts.out_of_stock}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <span className="text-xs text-muted-foreground">
              Showing {filtered.length} of {products.length} product{products.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || stockFilter !== "all" || categoryFilter !== "all") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStockFilter("all");
                  setCategoryFilter("all");
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset filters
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              getRowId={(p) => p.id}
              emptyLabel={
                stockFilter !== "all" || categoryFilter !== "all" || search
                  ? "No products match the selected filters."
                  : "No products found."
              }
            />
          )}
        </div>
      </AdminSection>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveProduct.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Name">
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: form.id ? form.slug : slugify(e.target.value),
                    })
                  }
                />
              </FormField>
              <FormField label="Slug">
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </FormField>
              <FormField label="SKU">
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </FormField>
              <FormField label="Category">
                <Select
                  value={form.category_id || ""}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Short description">
              <Textarea
                rows={2}
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              />
            </FormField>
            <FormField label="Full description">
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Benefits" hint="One per line">
              <Textarea
                rows={3}
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Ingredients">
                <Textarea
                  rows={3}
                  value={form.ingredients}
                  onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                />
              </FormField>
              <FormField label="Usage">
                <Textarea
                  rows={3}
                  value={form.usage}
                  onChange={(e) => setForm({ ...form, usage: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Specifications">
              <div className="space-y-2">
                {form.specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={spec.key}
                      onChange={(e) => {
                        const next = [...form.specifications];
                        next[idx] = { ...spec, key: e.target.value };
                        setForm({ ...form, specifications: next });
                      }}
                    />
                    <Input
                      placeholder="Value"
                      value={spec.value}
                      onChange={(e) => {
                        const next = [...form.specifications];
                        next[idx] = { ...spec, value: e.target.value };
                        setForm({ ...form, specifications: next });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm({
                          ...form,
                          specifications: form.specifications.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      specifications: [...form.specifications, { key: "", value: "" }],
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add spec
                </Button>
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField label="Price">
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </FormField>
              <FormField label="Compare-at price">
                <Input
                  type="number"
                  step="0.01"
                  value={form.compare_at_price}
                  onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                />
              </FormField>
              <FormField label="Stock">
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </FormField>
              <FormField label="Low stock threshold">
                <Input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="SEO title">
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                />
              </FormField>
              <FormField label="Meta description">
                <Input
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Images" hint="Click an image to set it as the featured image">
              <MultiImagePickerField
                values={form.images}
                onChange={(images) => setForm({ ...form, images })}
                featured={form.featured_image}
                onFeaturedChange={(url) => setForm({ ...form, featured_image: url })}
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveProduct.isPending}>
                {saveProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlagToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}
