"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Order } from "@shared/types";
import { 
  ShoppingBag, 
  Receipt, 
  AlertTriangle,
  ArrowRight,
  Package,
  TrendingUp,
  Clock,
  Truck,
  IndianRupee,
  CalendarDays,
  Calendar,
  BarChart3,
  Infinity as InfinityIcon
} from "lucide-react";
import Link from "next/link";

// ── Revenue period helpers ──────────────────────────────────────────────────
function startOfDay(d: Date)  { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function startOfLastYear(d: Date){ return new Date(d.getFullYear() - 1, 0, 1); }
function endOfLastYear(d: Date)  { return new Date(d.getFullYear() - 1, 11, 31, 23, 59, 59, 999); }

function revenueInRange(orders: any[], from: Date, to: Date): number {
  return orders
    .filter(o => {
      const d = new Date(o.created_at);
      return d >= from && d <= to;
    })
    .reduce((s, o) => s + (Number(o._revenue) || 0), 0);
}

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    todaysOrders: 0,
    pendingOrders: 0,
    lowStock: 0,
    // Revenue buckets
    revenueWeekly: 0,
    revenueMonthly: 0,
    revenueLastYear: 0,
    revenueAllTime: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch seller's products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id);

      const sellerProducts = (products || []) as Product[];
      const sellerProductIds = sellerProducts.map(p => p.id);
      const lowStockCount = sellerProducts.filter(p => (p.stock ?? 0) <= (p.low_stock_limit ?? 5)).length;

      // 2. Fetch all orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const allOrders = (orders || []) as Order[];

      // 3. Filter and process orders belonging to this seller
      let sellerOrderCount = 0;
      let todayCount = 0;
      let pendingCount = 0;
      const filteredRecentOrders: any[] = [];
      const sellerOrdersWithRevenue: any[] = [];

      const todayStr = new Date().toISOString().split("T")[0];

      allOrders.forEach(order => {
        try {
          const orderDateStr = new Date(order.created_at || "").toISOString().split("T")[0];
          const isToday = orderDateStr === todayStr;
          const isDirectSellerOrder = order.seller_id === user.id;
          let sellerItems: any[] = [];

          if (order.items && Array.isArray(order.items)) {
            sellerItems = order.items.filter((item: any) => sellerProductIds.includes(item.product_id || item.id));
          } else if (order.product_details) {
            try {
              const items = typeof order.product_details === "string"
                ? JSON.parse(order.product_details)
                : order.product_details;
              sellerItems = items.filter((item: any) => sellerProductIds.includes(item.id));
            } catch (_) {}
          }

          if (isDirectSellerOrder || sellerItems.length > 0) {
            sellerOrderCount++;
            if (isToday) todayCount++;
            if (["placed", "pending", "processing", "PLACED", "PENDING", "PROCESSING"].includes(order.order_status || "")) {
              pendingCount++;
            }

            const itemsRevenue = sellerItems.reduce((sum: number, item: any) =>
              sum + (item.subtotal || (item.price * item.quantity) || 0), 0);
            const orderRevenue = itemsRevenue > 0 ? itemsRevenue : (Number(order.total_amount) || 0);

            // store with _revenue for period calcs
            sellerOrdersWithRevenue.push({ ...order, _revenue: orderRevenue });

            if (filteredRecentOrders.length < 5) {
              filteredRecentOrders.push({
                id: order.id,
                order_number: order.order_number || String(order.id).slice(0, 8),
                customer_name: order.customer_name || "Customer",
                created_at: order.created_at,
                order_status: order.order_status,
                payment_status: order.payment_status,
                total_amount: orderRevenue
              });
            }
          }
        } catch (e) {
          console.error("Error processing order", order.id, e);
        }
      });

      // 4. Revenue period calculations
      const now = new Date();
      const revenueWeekly    = revenueInRange(sellerOrdersWithRevenue, startOfWeek(now),     now);
      const revenueMonthly   = revenueInRange(sellerOrdersWithRevenue, startOfMonth(now),    now);
      const revenueLastYear  = revenueInRange(sellerOrdersWithRevenue, startOfLastYear(now), endOfLastYear(now));
      const revenueAllTime   = sellerOrdersWithRevenue.reduce((s, o) => s + (Number(o._revenue) || 0), 0);

      setStats({
        totalProducts: sellerProducts.length,
        totalOrders: sellerOrderCount,
        todaysOrders: todayCount,
        pendingOrders: pendingCount,
        lowStock: lowStockCount,
        revenueWeekly,
        revenueMonthly,
        revenueLastYear,
        revenueAllTime,
      });
      setRecentOrders(filteredRecentOrders);

    } catch (error) {
      console.error("Error fetching seller dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("seller-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" },   () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          <span className="text-xs font-bold text-text-muted">Loading metrics...</span>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-primary via-emerald-800 to-emerald-950 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Overview</span>
          <h1 className="text-3xl font-black tracking-tight mt-1">Merchant Performance</h1>
          <p className="mt-2 text-xs font-bold opacity-90 max-w-xl">
            Track real-time revenue across weekly, monthly, yearly periods — plus order fulfillment and inventory.
          </p>
        </div>
      </div>

      {/* ── Revenue Period Cards ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee size={16} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-text-muted">Revenue Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* This Week */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">This Week</span>
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                <CalendarDays size={18} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">{fmt(stats.revenueWeekly)}</p>
            <span className="text-[10px] font-bold text-emerald-600/70 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> Sun → Today
            </span>
          </div>

          {/* This Month */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">This Month</span>
              <div className="h-9 w-9 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-600">
                <Calendar size={18} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-blue-700 dark:text-blue-300">{fmt(stats.revenueMonthly)}</p>
            <span className="text-[10px] font-bold text-blue-600/70 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> {new Date().toLocaleString("en-IN", { month: "long" })}
            </span>
          </div>

          {/* Last Year */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">Last Year</span>
              <div className="h-9 w-9 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-600">
                <BarChart3 size={18} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-purple-700 dark:text-purple-300">{fmt(stats.revenueLastYear)}</p>
            <span className="text-[10px] font-bold text-purple-600/70 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> FY {new Date().getFullYear() - 1}
            </span>
          </div>

          {/* All Time */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">All Time</span>
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300">{fmt(stats.revenueAllTime)}</p>
            <span className="text-[10px] font-bold text-amber-600/70 mt-1 inline-block">Total Cumulative</span>
          </div>

        </div>
      </div>

      {/* ── Operations Metric Cards ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-text-muted">Operations</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">

          {/* Total Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Orders</span>
              <div className="h-8 w-8 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Receipt size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{stats.totalOrders}</p>
            <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">All Time</span>
          </div>

          {/* Today's Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Today</span>
              <div className="h-8 w-8 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Clock size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{stats.todaysOrders}</p>
            <span className="text-[10px] font-bold text-purple-600 mt-1 inline-block">Fresh Placed</span>
          </div>

          {/* Pending Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Pending</span>
              <div className="h-8 w-8 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Truck size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{stats.pendingOrders}</p>
            <span className="text-[10px] font-bold text-amber-600 mt-1 inline-block">Needs Action</span>
          </div>

          {/* Products */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Products</span>
              <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{stats.totalProducts}</p>
            <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">Active Listings</span>
          </div>

          {/* Low Stock */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Low Stock</span>
              <div className="h-8 w-8 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{stats.lowStock}</p>
            <span className="text-[10px] font-bold text-rose-600 mt-1 inline-block">Action Required</span>
          </div>

        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black tracking-tight">Recent Orders</h2>
            <p className="text-xs font-bold text-text-secondary mt-0.5">Incoming purchases requiring fulfillment</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs font-bold">
            No orders received yet. Once customers place orders for your products, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.06] text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <th className="pb-3">Order #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04] text-xs font-bold">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-foreground/[0.02]">
                    <td className="py-4 font-black">{ord.order_number}</td>
                    <td className="py-4">{ord.customer_name}</td>
                    <td className="py-4 text-text-muted">
                      {new Date(ord.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {ord.order_status || "Processing"}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-primary">
                      ₹{Number(ord.total_amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
