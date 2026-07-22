"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Order } from "@shared/types";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Package, 
  Receipt, 
  DollarSign,
  Calendar
} from "lucide-react";

export default function SellerReports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"sales" | "product" | "order" | "inventory">("sales");
  const [dateRange, setDateRange] = useState("all");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id);

      const sProducts = (productsData || []) as Product[];
      setProducts(sProducts);
      const pIds = sProducts.map(p => p.id);

      // Orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const allOrders = (ordersData || []) as Order[];
      const filteredOrders: any[] = [];

      allOrders.forEach(ord => {
        const isDirect = ord.seller_id === user.id;
        let sellerItems: any[] = [];

        if (ord.items && Array.isArray(ord.items)) {
          sellerItems = ord.items.filter((i: any) => pIds.includes(i.product_id || i.id));
        } else if (ord.product_details) {
          try {
            const parsed = JSON.parse(ord.product_details || "[]");
            sellerItems = parsed.filter((i: any) => pIds.includes(i.id));
          } catch (e) {}
        }

        if (isDirect || sellerItems.length > 0) {
          const sellerTotal = sellerItems.reduce((sum: number, item: any) => sum + (item.subtotal || (item.price * item.quantity)), 0);
          filteredOrders.push({
            ...ord,
            seller_items: sellerItems,
            seller_total: sellerTotal > 0 ? sellerTotal : (ord.total_amount || 0)
          });
        }
      });

      setOrders(filteredOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCSV = () => {
    let csvHeader = "";
    let csvRows: string[] = [];

    if (reportType === "sales" || reportType === "order") {
      csvHeader = "Order ID,Customer Name,Date,Status,Total Amount (INR)\n";
      csvRows = orders.map(o => 
        `"${o.order_number || o.id}","${o.customer_name || 'Customer'}","${new Date(o.created_at).toLocaleDateString()}","${o.order_status || 'Placed'}","${o.seller_total || o.total_amount}"`
      );
    } else if (reportType === "product" || reportType === "inventory") {
      csvHeader = "Product Name,SKU,Brand,Price (INR),Stock Level,Low Stock Limit,Status\n";
      csvRows = products.map(p => 
        `"${p.name}","${p.sku || 'N/A'}","${p.brand || 'asaliswad'}","${p.price}","${p.stock || 0}","${p.low_stock_limit || 5}","${(p.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}"`
      );
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `asaliswad_seller_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.seller_total || 0), 0);
  const totalUnitsSold = orders.reduce((sum, o) => {
    return sum + (o.seller_items || []).reduce((iSum: number, item: any) => iSum + (item.quantity || 1), 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Analytics & Reports</h1>
          <p className="text-xs font-bold text-text-secondary mt-1">
            Generate and export performance reports for sales, inventory, and order fulfillment.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90"
        >
          <Download size={16} />
          Export CSV Report
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex gap-2 border-b border-foreground/[0.06] pb-3 overflow-x-auto">
        {[
          { key: "sales", label: "Sales Report" },
          { key: "product", label: "Product Report" },
          { key: "order", label: "Order Report" },
          { key: "inventory", label: "Inventory Report" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setReportType(t.key as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
              reportType === t.key
                ? "bg-primary text-white shadow-md"
                : "bg-foreground/[0.03] text-text-secondary hover:bg-foreground/[0.06]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06]">
          <span className="text-[10px] font-black uppercase text-text-muted">Total Sales Revenue</span>
          <p className="text-2xl font-black mt-2 text-primary">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06]">
          <span className="text-[10px] font-black uppercase text-text-muted">Total Orders Processed</span>
          <p className="text-2xl font-black mt-2">{orders.length}</p>
        </div>
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06]">
          <span className="text-[10px] font-black uppercase text-text-muted">Units Sold</span>
          <p className="text-2xl font-black mt-2">{totalUnitsSold}</p>
        </div>
        <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06]">
          <span className="text-[10px] font-black uppercase text-text-muted">Active Listings</span>
          <p className="text-2xl font-black mt-2">{products.length}</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl">
        <h2 className="text-base font-black mb-4 capitalize">{reportType} Breakdown Data</h2>
        
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : (reportType === "sales" || reportType === "order") ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.06] text-[10px] uppercase font-black text-text-muted">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-foreground/[0.02]">
                    <td className="py-3 font-black">{o.order_number || o.id.slice(0, 8)}</td>
                    <td className="py-3">{o.customer_name || "Customer"}</td>
                    <td className="py-3 text-text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600">
                        {o.order_status || "Placed"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-primary">₹{Number(o.seller_total || o.total_amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.06] text-[10px] uppercase font-black text-text-muted">
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Current Stock</th>
                  <th className="pb-3">Low Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-foreground/[0.02]">
                    <td className="py-3 font-black">{p.name}</td>
                    <td className="py-3 text-text-muted">{p.sku || "N/A"}</td>
                    <td className="py-3 font-black">₹{p.price}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${(p.stock || 0) <= (p.low_stock_limit || 5) ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {p.stock || 0} units
                      </span>
                    </td>
                    <td className="py-3 text-text-muted">{p.low_stock_limit || 5}</td>
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
