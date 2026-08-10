import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { CartLine, Product } from "./types";

type StoreState = {
  cart: CartLine[];
  wishlist: string[];
  recentlyViewed: string[];
  addToCart: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  trackViewed: (productId: string) => void;
  subtotal: number;
  cartCount: number;
};

const StoreContext = createContext<StoreState | null>(null);

const KEYS = {
  cart: "eclat.cart",
  wishlist: "eclat.wishlist",
  viewed: "eclat.viewed",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    setCart(read<CartLine[]>(KEYS.cart, []));
    setWishlist(read<string[]>(KEYS.wishlist, []));
    setRecentlyViewed(read<string[]>(KEYS.viewed, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEYS.cart, JSON.stringify(cart));
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEYS.wishlist, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEYS.viewed, JSON.stringify(recentlyViewed));
  }, [recentlyViewed, hydrated]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart((lines) => {
      const existing = lines.find((line) => line.productId === product.id);
      if (existing) {
        return lines.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: Math.min(line.quantity + quantity, 99) }
            : line,
        );
      }
      return [
        ...lines,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.category?.name ?? null,
          price: product.price,
          image: product.images?.[0] ?? null,
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.productId !== productId)
        : lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((lines) => lines.filter((line) => line.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((ids) =>
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
  }, []);

  const trackViewed = useCallback((productId: string) => {
    setRecentlyViewed((ids) => [productId, ...ids.filter((id) => id !== productId)].slice(0, 8));
  }, []);

  const value = useMemo<StoreState>(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
    return {
      cart,
      wishlist,
      recentlyViewed,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted: (id: string) => wishlist.includes(id),
      trackViewed,
      subtotal,
      cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [
    cart,
    wishlist,
    recentlyViewed,
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    trackViewed,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
