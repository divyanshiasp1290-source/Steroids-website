import { queryOptions } from "@tanstack/react-query";

import {
  fetchBrand,
  fetchBrands,
  fetchCategories,
  fetchCollection,
  fetchFaqs,
  fetchFeaturedReviews,
  fetchProduct,
  fetchProductReviews,
  fetchProductReviewStats,
  fetchProducts,
  fetchProductsByIds,
  fetchRelatedProducts,
} from "./api";
import type { ProductFilters } from "./types";

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => fetchCategories() });

export const brandsQuery = () => queryOptions({ queryKey: ["brands"], queryFn: () => fetchBrands() });


export const brandQuery = (slug: string) =>
  queryOptions({ queryKey: ["brand", slug], queryFn: () => fetchBrand(slug) });

export const productsQuery = (filters: ProductFilters) =>
  queryOptions({ queryKey: ["products", filters], queryFn: () => fetchProducts(filters) });

export const collectionQuery = (
  collection: "trending" | "best_sellers" | "new_arrivals",
  limit = 8,
) =>
  queryOptions({
    queryKey: ["collection", collection, limit],
    queryFn: () => fetchCollection(collection, limit),
  });

export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => fetchProduct(slug) });

export const productsByIdsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["products-by-ids", [...ids].sort()],
    queryFn: () => fetchProductsByIds(ids),
  });

export const relatedProductsQuery = (
  categoryId: string | null,
  brandId: string | null,
  excludeId: string,
) =>
  queryOptions({
    queryKey: ["related", categoryId, brandId, excludeId],
    queryFn: () => fetchRelatedProducts(categoryId, brandId, excludeId),
  });

export const productReviewsQuery = (productId: string) =>
  queryOptions({
    queryKey: ["reviews", productId],
    queryFn: () => fetchProductReviews(productId),
  });

export const productReviewStatsQuery = (productId: string) =>
  queryOptions({
    queryKey: ["reviews", "stats", productId],
    queryFn: () => fetchProductReviewStats(productId),
  });

export const featuredReviewsQuery = () =>
  queryOptions({ queryKey: ["reviews", "featured"], queryFn: () => fetchFeaturedReviews() });

export const faqsQuery = () => queryOptions({ queryKey: ["faqs"], queryFn: () => fetchFaqs() });

import {
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchBanners,
  fetchContactMessages,
  fetchCoupons,
  fetchCustomers,
  fetchDashboardStats,
  fetchMedia,
  fetchMyOrders,
  fetchPage,
  fetchPages,
  fetchSettings,
  fetchSubscribers,
} from "./api";
import type { OrderStatus } from "./types";

export const bannersQuery = (placement?: string) =>
  queryOptions({ queryKey: ["banners", placement ?? "all"], queryFn: () => fetchBanners(placement) });

export const pageQuery = (slug: string) =>
  queryOptions({ queryKey: ["page", slug], queryFn: () => fetchPage(slug) });

export const pagesQuery = () => queryOptions({ queryKey: ["pages"], queryFn: () => fetchPages() });

export const settingsQuery = () =>
  queryOptions({ queryKey: ["settings"], queryFn: () => fetchSettings() });

export const myOrdersQuery = (userId: string) =>
  queryOptions({ queryKey: ["my-orders", userId], queryFn: () => fetchMyOrders(userId) });

export const dashboardStatsQuery = () =>
  queryOptions({ queryKey: ["admin", "dashboard"], queryFn: () => fetchDashboardStats() });

export const adminProductsQuery = () =>
  queryOptions({ queryKey: ["admin", "products"], queryFn: () => fetchAdminProducts() });

export const adminOrdersQuery = (status: OrderStatus | "all" = "all") =>
  queryOptions({ queryKey: ["admin", "orders", status], queryFn: () => fetchAdminOrders(status) });

export const customersQuery = () =>
  queryOptions({ queryKey: ["admin", "customers"], queryFn: () => fetchCustomers() });

export const couponsQuery = () =>
  queryOptions({ queryKey: ["admin", "coupons"], queryFn: () => fetchCoupons() });

export const activeCouponsQuery = () =>
  queryOptions({
    queryKey: ["coupons", "active"],
    queryFn: async () => {
      // Use fetchCoupons (known working) then filter for active & not expired on the client.
      const all = await fetchCoupons();
      const now = Date.now();
      return all.filter((c) => {
        if (!c.is_active) return false;
        if (c.starts_at && new Date(c.starts_at).getTime() > now) return false;
        if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
        return true;
      });
    },
  });

export const mediaQuery = () =>
  queryOptions({ queryKey: ["admin", "media"], queryFn: () => fetchMedia() });

export const contactMessagesQuery = () =>
  queryOptions({ queryKey: ["admin", "messages"], queryFn: () => fetchContactMessages() });

export const subscribersQuery = () =>
  queryOptions({ queryKey: ["admin", "subscribers"], queryFn: () => fetchSubscribers() });

export const adminBrandsQuery = () =>
  queryOptions({ queryKey: ["admin", "brands"], queryFn: () => fetchBrands(true) });

export const adminCategoriesQuery = () =>
  queryOptions({ queryKey: ["admin", "categories"], queryFn: () => fetchCategories(true) });

export const adminFaqsQuery = () =>
  queryOptions({ queryKey: ["admin", "faqs"], queryFn: () => fetchFaqs(true) });

export const adminBannersQuery = () =>
  queryOptions({ queryKey: ["admin", "banners"], queryFn: () => fetchBanners(undefined, true) });

export const adminReviewsQuery = () =>
  queryOptions({ queryKey: ["admin", "reviews"], queryFn: () => fetchAdminReviews() });
