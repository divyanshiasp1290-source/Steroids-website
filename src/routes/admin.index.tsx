import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminSection } from "@/components/admin/AdminSection";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardStatsQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function AdminDashboard() {
  const { data, isLoading } = useQuery(dashboardStatsQuery());

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={CURRENCY.format(data.totalSales)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Orders"
          value={data.totalOrders}
          hint={`${data.pendingOrders} pending`}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard
          label="Customers"
          value={data.totalCustomers}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Products"
          value={data.totalProducts}
          hint={`${data.lowStock.length} low stock`}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Revenue — last 30 days</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.revenueByDay}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              minTickGap={20}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
            <Tooltip
              formatter={(v: number) => CURRENCY.format(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fill="url(#revenueFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <AdminSection title="Low stock products" description="Products at or below their threshold">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lowStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Nothing low on stock.
                  </TableCell>
                </TableRow>
              ) : (
                data.lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock === 0 ? "destructive" : "outline"}>{p.stock}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminSection>
    </div>
  );
}
