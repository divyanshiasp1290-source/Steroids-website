import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  HelpCircle,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Tags,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true } as {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/media", label: "Media", icon: Image },
  { to: "/admin/inbox", label: "Inbox", icon: Inbox },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const SIDEBAR_COLORS: Record<string, string> = {
  "/admin": "from-sky-200/50 to-cyan-200/30",
  "/admin/products": "from-emerald-200/60 to-green-200/30",
  "/admin/categories": "from-violet-200/60 to-fuchsia-200/30",
  "/admin/orders": "from-orange-200/60 to-amber-200/30",
  "/admin/customers": "from-pink-200/60 to-rose-200/30",
  "/admin/coupons": "from-lime-200/60 to-green-200/30",
  "/admin/faqs": "from-slate-200/60 to-slate-100/50",
  "/admin/reviews": "from-yellow-200/60 to-amber-200/30",
  "/admin/media": "from-sky-200/60 to-blue-200/30",
  "/admin/inbox": "from-amber-200/60 to-orange-200/30",
  "/admin/settings": "from-slate-200/60 to-slate-100/50",
};


export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-muted/30 overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/95 lg:fixed lg:top-20 lg:left-0 lg:block lg:h-[calc(100vh-5rem)] lg:flex lg:flex-col lg:shadow-sm">
        <SidebarContent pathname={pathname} onNavigate={() => undefined} />
      </aside>


      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-56 flex-col overflow-y-auto bg-card shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Admin menu
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} mobile={true} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <div className="lg:hidden flex h-12 items-center gap-3 bg-card px-3">
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">Admin</span>
        </div>
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate, mobile = false }: { pathname: string; onNavigate: () => void; mobile?: boolean }) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          const colorClasses = SIDEBAR_COLORS[item.to] ?? "from-primary/20 to-primary/10";
          const linkTextSize = mobile ? "text-xs" : "text-sm";

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2 ${linkTextSize} font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-2xl transition-colors ${
                  isActive ? "bg-white/90 text-primary" : "bg-muted text-muted-foreground group-hover:bg-accent/70"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
