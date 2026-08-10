import { supabase } from "./supabase";
import type {
  Banner,
  Brand,
  Category,
  ContactMessage,
  Coupon,
  DashboardStats,
  Faq,
  MediaAsset,
  NewsletterSubscriber,
  Order,
  OrderItem,
  OrderStatus,
  Paginated,
  Product,
  ProductFilters,
  Profile,
  Review,
  SitePage,
} from "./types";

const PRODUCT_SELECT =
  "id,slug,name,sku,short_description,description,benefits,usage,ingredients,specifications,price,compare_at_price,currency,stock,low_stock_threshold,rating,review_count,images,category_id,brand_id,is_published,is_featured,is_trending,is_best_seller,is_new_arrival,seo_title,meta_description,created_at,brand:brands(id,slug,name),category:categories(id,slug,name)";

const REVIEW_SELECT =
  "id,product_id,user_id,author_name,author_location,rating,title,body,created_at,is_featured,is_approved";

function normalizeProduct(row: unknown): Product {
  const r = row as Record<string, unknown>;
  const one = <T,>(value: unknown): T | null =>
    Array.isArray(value) ? ((value[0] as T) ?? null) : ((value as T) ?? null);
  return {
    ...(r as unknown as Product),
    brand: one(r["brand"]),
    category: one(r["category"]),
  };
}

/* ------------------------------------------------------------------ */
/* Catalogue — public reads                                            */
/* ------------------------------------------------------------------ */

export async function fetchCategories(includeHidden = false): Promise<Category[]> {
  let q = supabase
    .from("categories")
    .select("id,slug,name,description,image_url,sort_order,is_visible")
    .order("sort_order")
    .order("name");
  if (!includeHidden) q = q.eq("is_visible", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchBrands(includeHidden = false): Promise<Brand[]> {
  let q = supabase
    .from("brands")
    .select("id,slug,name,logo_url,description,country,sort_order,is_visible")
    .order("sort_order")
    .order("name");
  if (!includeHidden) q = q.eq("is_visible", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Brand[];
}

export async function fetchBrand(slug: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("id,slug,name,logo_url,description,country,sort_order,is_visible")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Brand) ?? null;
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<Paginated<Product>> {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 12;
  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" });

  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  if (filters.categories?.length) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .in("slug", filters.categories);
    query = query.in("category_id", (data ?? []).map((c) => c.id));
  }
  if (filters.brands?.length) {
    const { data } = await supabase.from("brands").select("id").in("slug", filters.brands);
    query = query.in("brand_id", (data ?? []).map((b) => b.id));
  }
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.inStockOnly) query = query.gt("stock", 0);
  if (filters.minRating) query = query.gte("rating", filters.minRating);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false, nullsFirst: false });
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []).map(normalizeProduct), total: count ?? 0 };
}

type Collection = "trending" | "best_sellers" | "new_arrivals";

export async function fetchCollection(collection: Collection, limit = 8): Promise<Product[]> {
  const column =
    collection === "trending"
      ? "is_trending"
      : collection === "best_sellers"
        ? "is_best_seller"
        : "is_new_arrival";

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq(column, true)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeProduct(data) : null;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeProduct(data) : null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).in("id", ids);
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export async function fetchRelatedProducts(
  categoryId: string | null,
  brandId: string | null,
  excludeId: string,
  limit = 5,
): Promise<Product[]> {
  // Try same category first (if provided), then same brand, then recent products.
  const results: Product[] = [];

  // Helper to run a query and append unique products up to the limit
  async function runQuery(builder: any) {
    const { data, error } = await builder.limit(limit);
    if (error) throw error;
    const rows = (data ?? []).map(normalizeProduct) as Product[];
    for (const r of rows) {
      if (r.id === excludeId) continue;
      if (!results.find((p) => p.id === r.id)) results.push(r);
      if (results.length >= limit) break;
    }
  }

  if (categoryId) {
    const q = supabase.from("products").select(PRODUCT_SELECT).neq("id", excludeId).eq("category_id", categoryId).order("created_at", { ascending: false, nullsFirst: false });
    await runQuery(q);
  }

  if (results.length < limit && brandId) {
    const q = supabase.from("products").select(PRODUCT_SELECT).neq("id", excludeId).eq("brand_id", brandId).order("created_at", { ascending: false, nullsFirst: false });
    await runQuery(q);
  }

  if (results.length < limit) {
    const q = supabase.from("products").select(PRODUCT_SELECT).neq("id", excludeId).order("created_at", { ascending: false, nullsFirst: false });
    await runQuery(q);
  }

  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Reviews / faq / banners / pages / settings                   */
/* ------------------------------------------------------------------ */

export async function fetchProductReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export type ReviewStats = { count: number; average: number | null };

export async function fetchProductReviewStats(productId: string): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("is_approved", true);
  if (error) throw error;
  const rows = (data ?? []) as { rating: number }[];
  if (rows.length === 0) return { count: 0, average: null };
  const total = rows.reduce((sum, r) => sum + Number(r.rating), 0);
  return { count: rows.length, average: total / rows.length };
}

export async function fetchFeaturedReviews(limit = 3): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("is_featured", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function fetchAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function fetchFaqs(includeHidden = false): Promise<Faq[]> {
  let q = supabase
    .from("faqs")
    .select("id,question,answer,category,position,is_visible")
    .order("position", { ascending: true, nullsFirst: false });
  if (!includeHidden) q = q.eq("is_visible", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Faq[];
}

export async function fetchBanners(placement?: string, includeInactive = false): Promise<Banner[]> {
  let q = supabase.from("banners").select("*").order("position");
  if (placement) q = q.eq("placement", placement);
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  const now = Date.now();
  const rows = (data ?? []) as Banner[];
  if (includeInactive) return rows;
  return rows.filter(
    (b) =>
      (!b.starts_at || new Date(b.starts_at).getTime() <= now) &&
      (!b.ends_at || new Date(b.ends_at).getTime() >= now),
  );
}

export async function fetchPage(slug: string): Promise<SitePage | null> {
  const { data, error } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as SitePage) ?? null;
}

export async function fetchPages(): Promise<SitePage[]> {
  const { data, error } = await supabase.from("pages").select("*").order("title");
  if (error) throw error;
  return (data ?? []) as SitePage[];
}

export async function fetchSettings(): Promise<Record<string, Record<string, unknown>>> {
  const { data, error } = await supabase.from("settings").select("key,value");
  if (error) throw error;
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) out[row.key] = (row.value ?? {}) as Record<string, unknown>;
  return out;
}

export async function saveSetting(key: string, value: Record<string, unknown>) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Submissions                                                         */
/* ------------------------------------------------------------------ */

export async function subscribeToNewsletter(email: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Enter a valid email address.");
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: clean });
  if (error) {
    if (error.code === "23505") return;
    throw error;
  }
}

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const message = payload.message.trim();
  if (!name || name.length > 100) throw new Error("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (!message || message.length > 2000) throw new Error("Message must be 1–2000 characters.");
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject: payload.subject.trim().slice(0, 200) || null,
    message,
  });
  if (error) throw error;
}

export type SubmitReviewInput = {
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
};

/**
 * Submit a review for a product. Only authenticated users who have a delivered
 * order containing the product may review it (verified purchase), and each user
 * may submit at most one review per product.
 */
export async function submitProductReview(input: SubmitReviewInput): Promise<Review> {
  const authorName = input.authorName.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  const rating = Math.round(input.rating);

  if (!authorName || authorName.length > 100)
    throw new Error("Please enter your name.");
  if (title.length > 200) throw new Error("Review title must be 200 characters or fewer.");
  if (!body || body.length > 2000) throw new Error("Review text must be 1–2000 characters.");
  if (rating < 1 || rating > 5) throw new Error("Please select a rating between 1 and 5 stars.");

  // Require a signed-in user (RLS insert requires user_id = auth.uid()).
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Please sign in to leave a review.");

  // Verify the user has a delivered order containing this product.
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, items:order_items(product_id)")
    .eq("user_id", userId);
  if (ordersError) throw ordersError;

  const hasDelivered = (orders ?? []).some(
    (o) =>
      o.status === "delivered" &&
      o.items?.some((i: { product_id: string | null }) => i.product_id === input.productId),
  );
  if (!hasDelivered) {
    throw new Error(
      "You can only review products you've purchased and received. It appears you don't have a delivered order for this product yet.",
    );
  }

  // Prevent duplicate reviews for the same product by this user.
  const { data: existing, error: dupError } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", input.productId)
    .eq("user_id", userId)
    .maybeSingle();
  if (dupError) throw dupError;
  if (existing) throw new Error("You've already reviewed this product.");

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: input.productId,
      user_id: userId,
      author_name: authorName,
      rating,
      title: title || null,
      body,
      is_featured: false,
      is_approved: true,
    })
    .select(REVIEW_SELECT)
    .single();
  if (error) throw error;
  return data as Review;
}

/* ------------------------------------------------------------------ */
/* Coupons + orders                                                    */
/* ------------------------------------------------------------------ */

export async function validateCoupon(code: string, subtotal: number): Promise<Coupon> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That code isn't recognised.");
  const coupon = data as Coupon;
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now)
    throw new Error("That code isn't active yet.");
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now)
    throw new Error("That code has expired.");
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit)
    throw new Error("That code has been fully redeemed.");
  if (subtotal < Number(coupon.min_order_amount))
    throw new Error(`Minimum spend for this code is ${coupon.min_order_amount}.`);
  return coupon;
}

export type CreateOrderInput = {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_address: Record<string, string>;
  billing_address?: Record<string, string> | null;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon_id?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  user_id?: string | null;
  items: {
    product_id: string;
    product_name: string;
    product_slug: string | null;
    image_url: string | null;
    unit_price: number;
    quantity: number;
  }[];
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { items, ...order } = input;
  if (items.length === 0) throw new Error("Your bag is empty.");

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone ?? null,
      shipping_address: order.shipping_address as never,
      billing_address: (order.billing_address ?? order.shipping_address) as never,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      coupon_id: order.coupon_id ?? null,
      payment_method: order.payment_method ?? "cash_on_delivery",
      notes: order.notes ?? null,
      user_id: order.user_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const created = data as unknown as Order;
  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: created.id,
      product_id: i.product_id,
      product_name: i.product_name,
      product_slug: i.product_slug,
      image_url: i.image_url,
      unit_price: i.unit_price,
      quantity: i.quantity,
      line_total: Number((i.unit_price * i.quantity).toFixed(2)),
    })),
  );
  if (itemsError) throw itemsError;
  return created;
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Order) ?? null;
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: patch.full_name ?? null, phone: patch.phone ?? null })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/* ------------------------------------------------------------------ */
/* Admin — generic CRUD                                                */
/* ------------------------------------------------------------------ */

type TableName =
  | "products"
  | "categories"
  | "brands"
  | "faqs"
  | "banners"
  | "pages"
  | "coupons"
  | "media"
  | "reviews";

export async function adminUpsert<T extends Record<string, unknown>>(
  table: TableName,
  values: T,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from(table)
    .upsert(values as never)
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function adminDelete(table: TableName, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function adminSetFlag(table: TableName, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from(table)
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

export async function adminUpdateReview(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("reviews").update(patch as never).eq("id", id);
  if (error) throw error;
}

export type AdminReview = Review & { product_name: string | null };

const ADMIN_REVIEW_SELECT =
  "id, product_id, user_id, author_name, author_location, rating, title, body, is_featured, is_approved, created_at";

/**
 * Fetches all reviews for the admin panel in one direct read from public.reviews.
 * The query requests the canonical review columns and pulls the related product
 * name through the products relation so the admin page gets a flat row shape.
 *
 * This call relies on the authenticated RLS context. The admin route is already
 * behind the admin UI shell, so the current session is expected to resolve to an
 * admin-capable role with access to approve/reject the full review set.
 */
export async function fetchAdminReviews(): Promise<AdminReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(`${ADMIN_REVIEW_SELECT}, products(name)`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const products = row["products"] as Record<string, unknown> | null | undefined;
    const productName = Array.isArray(products)
      ? (products[0] as Record<string, unknown> | undefined)?.name ?? null
      : products && typeof products === "object"
        ? ((products as Record<string, unknown>).name as string | null | undefined) ?? null
        : null;

    return {
      id: row["id"] as string,
      product_id: (row["product_id"] as string | null) ?? null,
      user_id: (row["user_id"] as string | null) ?? null,
      author_name: row["author_name"] as string,
      author_location: (row["author_location"] as string | null) ?? null,
      rating: Number(row["rating"]),
      title: (row["title"] as string | null) ?? null,
      body: (row["body"] as string) ?? "",
      is_featured: Boolean(row["is_featured"]),
      is_approved: Boolean(row["is_approved"]),
      created_at: (row["created_at"] as string | null) ?? null,
      product_name: productName,
    } as AdminReview;
  });
}

/* ------------------------------------------------------------------ */
/* Admin — orders, customers, inbox, media                             */
/* ------------------------------------------------------------------ */

export async function fetchAdminOrders(status?: OrderStatus | "all"): Promise<Order[]> {
  let q = supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function fetchCustomers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setCustomerBlocked(id: string, blocked: boolean) {
  const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", id);
  if (error) throw error;
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContactMessage[];
}

export async function fetchSubscribers(): Promise<NewsletterSubscriber[]> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NewsletterSubscriber[];
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Coupon[];
}

export async function fetchActiveCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  // Filter out coupons that haven't started yet or already expired on the client
  return (data ?? []).filter((c: Coupon) => {
    if (c.starts_at && new Date(c.starts_at).getTime() > now) return false;
    if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
    return true;
  }) as Coupon[];
}

export async function fetchMedia(): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function uploadMedia(file: File, folder = "general"): Promise<MediaAsset> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const { data, error } = await supabase
    .from("media")
    .insert({
      url: pub.publicUrl,
      path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      folder,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMedia(asset: MediaAsset) {
  if (asset.path) await supabase.storage.from("media").remove([asset.path]);
  const { error } = await supabase.from("media").delete().eq("id", asset.id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Refund requests                                                     */
/* ------------------------------------------------------------------ */

export async function createRefundRequest(orderId: string, userId: string | null, reason: string) {
  const { data, error } = await supabase
    .from("refund_requests")
    .insert({ order_id: orderId, user_id: userId, reason, status: "requested", created_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) {
    // If the table doesn't exist or other error, surface it
    throw error;
  }
  return data as { id: string };
}

/* ------------------------------------------------------------------ */
/* Admin — dashboard                                                   */
/* ------------------------------------------------------------------ */

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [ordersRes, productsRes, customersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,status,total,customer_name,customer_email,created_at,user_id")
      .order("created_at", { ascending: false }),
    supabase.from("products").select(PRODUCT_SELECT),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (productsRes.error) throw productsRes.error;
  if (customersRes.error) throw customersRes.error;

  const orders = (ordersRes.data ?? []) as unknown as Order[];
  const products = (productsRes.data ?? []).map(normalizeProduct);
  const customers = (customersRes.data ?? []) as Profile[];

  const paid = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const totalSales = paid.reduce((sum, o) => sum + Number(o.total), 0);

  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = paid.filter((o) => o.created_at?.slice(0, 10) === key);
    days.push({
      date: key,
      revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
      orders: dayOrders.length,
    });
  }

  const statuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  return {
    totalSales,
    totalOrders: orders.length,
    totalCustomers: customers.length,
    totalProducts: products.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    lowStock: products
      .filter((p) => p.stock <= (p.low_stock_threshold ?? 5))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8),
    recentOrders: orders.slice(0, 6),
    latestCustomers: customers.slice(0, 6),
    revenueByDay: days,
    ordersByStatus: statuses
      .map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length }))
      .filter((s) => s.count > 0),
  };
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export type { OrderItem };

/* ------------------------------------------------------------------ */
/* Admin — inbox + subscribers mutations                               */
/* ------------------------------------------------------------------ */

export async function setMessageRead(id: string, isRead: boolean) {
  const { error } = await supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw error;
}

export async function setSubscriberActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}
