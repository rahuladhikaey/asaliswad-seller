"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Order } from "@shared/types";
import { 
  ShoppingBag, 
  Receipt, 
  DollarSign, 
  AlertTriangle,
  ArrowRight,
  Package,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    todaysOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    revenue: 0,
    lowStock: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
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

        // 2. Count low stock products
        const lowStockCount = sellerProducts.filter(p => (p.stock ?? 0) <= (p.low_stock_limit ?? 5)).length;

        // 3. Fetch all orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        const allOrders = (orders || []) as Order[];

        // 4. Filter and process orders belonging to this seller
        let sellerOrderCount = 0;
        let todayCount = 0;
        let pendingCount = 0;
        let totalSalesVolume = 0;
        let sellerRevenue = 0;
        const filteredRecentOrders: any[] = [];

        const todayStr = new Date().toISOString().split("T")[0];

        allOrders.forEach(order => {
          try {
            const orderDateStr = new Date(order.created_at || "").toISOString().split("T")[0];
            const isToday = orderDateStr === todayStr;

            // Direct seller check or item match
            const isDirectSellerOrder = order.seller_id === user.id;
            let sellerItems: any[] = [];

            if (order.items && Array.isArray(order.items)) {
              sellerItems = order.items.filter((item: any) => sellerProductIds.includes(item.product_id || item.id));
            } else if (order.product_details) {
              const items = JSON.parse(order.product_details || "[]");
              sellerItems = items.filter((item: any) => sellerProductIds.includes(item.id));
            }

            if (isDirectSellerOrder || sellerItems.length > 0) {
              sellerOrderCount++;
              if (isToday) todayCount++;
              if (order.order_status === "placed" || order.order_status === "pending" || order.order_status === "processing") {
                pendingCount++;
              }

              const itemsRevenue = sellerItems.reduce((sum: number, item: any) => sum + (item.subtotal || (item.price * item.quantity)), 0);
              const orderRevenue = itemsRevenue > 0 ? itemsRevenue : (order.total_amount || 0);
              
              sellerRevenue += Number(orderRevenue);
              totalSalesVolume += sellerItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

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

        setStats({
          totalProducts: sellerProducts.length,
          totalOrders: sellerOrderCount,
          todaysOrders: todayCount,
          pendingOrders: pendingCount,
          totalSales: totalSalesVolume,
          revenue: sellerRevenue,
          lowStock: lowStockCount
        });
        setRecentOrders(filteredRecentOrders);

      } catch (error) {
        console.error("Error fetching seller dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          <span className="text-xs font-bold text-text-muted">Loading metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-primary via-emerald-800 to-emerald-950 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Overview</span>
          <h1 className="text-3xl font-black tracking-tight mt-1">Merchant Performance</h1>
          <p className="mt-2 text-xs font-bold opacity-90 max-w-xl">
            Track real-time sales, order fulfillment status, inventory levels, and customer activity.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Revenue</span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">₹{stats.revenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-1">
            <TrendingUp size={12} /> Total Earnings
          </span>
        </div>

        {/* Total Orders */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Orders</span>
            <div className="h-9 w-9 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Receipt size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{stats.totalOrders}</p>
          <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">All Time Received</span>
        </div>

        {/* Today's Orders */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Today's Orders</span>
            <div className="h-9 w-9 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{stats.todaysOrders}</p>
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-1 inline-block">Fresh Placed</span>
        </div>

        {/* Pending Orders */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Pending Orders</span>
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Truck size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{stats.pendingOrders}</p>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 inline-block">Needs Processing</span>
        </div>

        {/* Active Products */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Products</span>
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{stats.totalProducts}</p>
          <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">Active Listings</span>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Low Stock</span>
            <div className="h-9 w-9 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{stats.lowStock}</p>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 inline-block">Action Required</span>
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
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {ord.order_status || "Processing"}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-primary">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN')}
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
