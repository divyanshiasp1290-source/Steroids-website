import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { signOut, useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");

const NAV = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
] as const;

export function Header() {
  const { cartCount, wishlist } = useStore();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const isAdmin = isAdminRoute(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overlay = isHome && !scrolled && !searchOpen;
  const headerSpacerClass = isAdmin ? "h-16 lg:h-20" : "h-20 lg:h-24";

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    navigate({ to: "/shop", search: { q: term || undefined } });
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
          overlay
            ? "border-b border-on-media/15 bg-transparent text-on-media"
            : "glass-panel border-b border-border text-foreground",
        )}
      >
{!isAdmin ? (
          <p
            className={cn(
              "py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
              overlay
                ? "border-b border-on-media/10 text-on-media/75"
                : "bg-primary text-primary-foreground",
            )}
          >
            Free discreet UK delivery on orders over £100
          </p>
        ) : null}

        <div className="container-page grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 lg:h-20">
{!isAdmin ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-accent/80 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-xl font-bold text-foreground">Admin Panel</span>
          )}

          <Link
            to="/"
            className={cn(
              "justify-self-center font-display text-3xl font-semibold tracking-tight",
              isAdmin ? "" : "lg:justify-self-start lg:text-[1.4rem]",
            )}
          >
            Medi<span className="text-accent">Pharma</span>
          </Link>

{!isAdmin ? (
            <nav className="hidden justify-self-center lg:flex lg:items-center lg:gap-7">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: overlay ? "opacity-100" : "text-accent" }}
                  className={cn(
                    "link-underline text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                    overlay ? "text-on-media/80 hover:text-on-media" : "hover:text-accent",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

{!isAdmin ? (
            <div className="flex items-center gap-1 justify-self-end sm:gap-2">
              <button
                type="button"
                aria-label="Search"
                onClick={() => setSearchOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center transition-opacity hover:opacity-70"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="relative grid h-9 w-9 place-items-center transition-opacity hover:opacity-70"
              >
                <Heart className="h-[18px] w-[18px]" />
                {wishlist.length > 0 ? <Badge>{wishlist.length}</Badge> : null}
              </Link>
              <Link
                to="/cart"
                aria-label="Cart"
                className="relative grid h-9 w-9 place-items-center transition-opacity hover:opacity-70"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {cartCount > 0 ? <Badge>{cartCount}</Badge> : null}
              </Link>
              {user ? (
                <Link
                  to="/account"
                  className="hidden rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary sm:inline-flex"
                >
                  Account
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary sm:inline-flex"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="hidden rounded-md bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent sm:inline-flex"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 justify-self-end">
              <Link
                to="/"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                View store
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>

        {searchOpen ? (
          <div className="border-t border-border bg-background text-foreground">
            <form onSubmit={submitSearch} className="container-page flex flex-wrap items-center gap-4 py-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search medicines, treatments, categories"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : null}
      </header>

    {isHome ? null : <div className={headerSpacerClass} aria-hidden />}

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[65%] max-w-[16rem] flex-col bg-background p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="sr-only">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-sm uppercase tracking-[0.08em] text-foreground transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5">
              {user ? (
                <Link
                  to="/account"
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-sm text-foreground transition-colors hover:text-accent"
                >
                  Account
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                                      className="font-display text-sm text-foreground transition-colors hover:text-accent"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                                      className="font-display text-sm text-foreground transition-colors hover:text-accent"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
      {children}
    </span>
  );
}
