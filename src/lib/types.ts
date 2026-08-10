export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order?: number | null;
  is_visible?: boolean | null;
  product_count?: number | null;
};

export type Brand = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  country: string | null;
  sort_order?: number | null;
  is_visible?: boolean | null;
  product_count?: number | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  short_description: string | null;
  description: string | null;
  benefits: string[] | null;
  usage: string | null;
  ingredients: string | null;
  specifications: Record<string, string> | null;
  price: number;
  compare_at_price: number | null;
  currency: string | null;
  stock: number;
  low_stock_threshold?: number | null;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  category_id?: string | null;
  brand_id?: string | null;
  is_published?: boolean | null;
  is_featured?: boolean | null;
  is_trending: boolean | null;
  is_best_seller: boolean | null;
  is_new_arrival: boolean | null;
  seo_title?: string | null;
  meta_description?: string | null;
  created_at: string | null;
  brand: Pick<Brand, "id" | "slug" | "name"> | null;
  category: Pick<Category, "id" | "slug" | "name"> | null;
};

export type Review = {
  id: string;
  product_id: string | null;
  user_id?: string | null;
  author_name: string;
  author_location: string | null;
  rating: number;
  title: string | null;
  body: string;
  created_at: string | null;
  is_featured: boolean | null;
  is_approved?: boolean | null;
  is_verified_purchase?: boolean | null;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  position: number | null;
  is_visible?: boolean | null;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  placement: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  seo_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  updated_at: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  url: string;
  path: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder: string;
  alt: string | null;
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type ProductFilters = {
  search?: string | undefined;
  categories?: string[] | undefined;
  brands?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
  minRating?: number | undefined;
  sort?: ProductSort | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
};

export type ProductSort = "newest" | "price-asc" | "price-desc" | "rating" | "name";

export type Paginated<T> = {
  items: T[];
  total: number;
};

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  image: string | null;
  quantity: number;
};

export type DashboardStats = {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStock: Product[];
  recentOrders: Order[];
  latestCustomers: Profile[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
};
