"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Order, Product } from "@shared/types";
import { 
  Receipt, 
  Package, 
  User, 
  MapPin, 
  Calendar,
  ChevronDown,
  Eye,
  X,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Box
} from "lucide-react";

const ORDER_STATUSES = [
  { label: "All Orders", key: "all" },
  { label: "New / Placed", key: "placed" },
  { label: "Confirmed", key: "confirmed" },
  { label: "Processing", key: "processing" },
  { label: "Packed", key: "packed" },
  { label: "Ready to Ship", key: "ready_to_ship" },
  { label: "Delivered", key: "delivered" },
  { label: "Cancelled", key: "cancelled" },
];

export default function SellerOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch seller's products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id);
      
      const sProducts = (products || []) as Product[];
      setSellerProducts(sProducts);
      const sellerProductIds = sProducts.map(p => p.id);

      // 2. Fetch all orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const allOrders = (ordersData || []) as Order[];

      // 3. Filter orders containing seller's items
      const filteredOrders: any[] = [];
      allOrders.forEach(order => {
        try {
          const isDirectSellerOrder = order.seller_id === user.id;
          let sellerItems: any[] = [];

          if (order.items && Array.isArray(order.items)) {
            sellerItems = order.items.filter((item: any) => sellerProductIds.includes(item.product_id || item.id));
          } else if (order.product_details) {
            const items = JSON.parse(order.product_details || "[]");
            sellerItems = items.filter((item: any) => sellerProductIds.includes(item.id));
          }

          if (isDirectSellerOrder || sellerItems.length > 0) {
            const sellerTotal = sellerItems.reduce((sum: number, item: any) => sum + (item.subtotal || (item.price * item.quantity)), 0);
            filteredOrders.push({
              ...order,
              seller_items: sellerItems,
              seller_total: sellerTotal > 0 ? sellerTotal : (order.total_amount || 0)
            });
          }
        } catch (e) {
          console.error("Error parsing order items", order.id, e);
        }
      });

      setOrders(filteredOrders);
    } catch (e) {
      console.error("Error loading orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusMessage("Updating status...");
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      setStatusMessage("✅ Order status updated!");
      setOrders(orders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`❌ Error: ${e.message || "Failed to update status."}`);
    }
  };

  const filteredByTab = orders.filter(ord => {
    if (activeTab === "all") return true;
    return (ord.order_status || "placed").toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Order Management</h1>
          <p className="text-xs font-bold text-text-secondary mt-1">
            Fulfill and track customer orders across all pipeline stages.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20 text-xs font-black text-primary">
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-foreground/[0.06]">
        {ORDER_STATUSES.map(tab => {
          const isActive = activeTab === tab.key;
          const count = orders.filter(o => tab.key === "all" || (o.order_status || "placed").toLowerCase() === tab.key.toLowerCase()).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-foreground/[0.03] text-text-secondary hover:bg-foreground/[0.06]"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-foreground/10 text-text-muted"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : filteredByTab.length === 0 ? (
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-12 text-center">
          <Receipt size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-base font-black">No orders found</h3>
          <p className="text-xs font-bold text-text-muted mt-1">
            There are no orders matching the "{ORDER_STATUSES.find(t => t.key === activeTab)?.label}" status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredByTab.map(order => (
            <div 
              key={order.id}
              className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-6 hover:border-primary/30 transition-all backdrop-blur-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/[0.06] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                    #
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-text-muted tracking-wider block">Order ID</span>
                    <h3 className="text-sm font-black">{order.order_number || order.id.slice(0, 8)}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-text-muted flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(order.created_at).toLocaleString()}
                  </span>

                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {order.order_status || "placed"}
                  </span>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:opacity-90"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </div>

              {/* Order quick overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-black tracking-wider mb-0.5">Customer</span>
                  <p className="text-sm font-black">{order.customer_name || "Customer"}</p>
                  <p className="text-text-muted">{order.customer_phone || order.phone || "No phone"}</p>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-black tracking-wider mb-0.5">Items</span>
                  <p className="font-black">{order.seller_items?.length || 1} product(s)</p>
                </div>
                <div className="md:text-right">
                  <span className="text-text-muted block text-[10px] uppercase font-black tracking-wider mb-0.5">Order Amount</span>
                  <p className="text-base font-black text-primary">₹{Number(order.seller_total || order.total_amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-background border border-foreground/[0.08] p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">Order Overview</span>
                <h2 className="text-xl font-black">{selectedOrder.order_number || selectedOrder.id}</h2>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 hover:bg-foreground/5 text-text-muted"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Pipeline Buttons */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-2">
                Update Order Pipeline Status
              </label>
              <div className="flex flex-wrap gap-2">
                {["placed", "confirmed", "processing", "packed", "ready_to_ship", "delivered", "cancelled"].map(statusKey => (
                  <button
                    key={statusKey}
                    onClick={() => handleUpdateStatus(selectedOrder.id, statusKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      (selectedOrder.order_status || "placed").toLowerCase() === statusKey
                        ? "bg-primary text-white shadow-md"
                        : "bg-foreground/[0.04] text-text-secondary hover:bg-foreground/[0.08]"
                    }`}
                  >
                    {statusKey.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">Purchased Items</h3>
              <div className="space-y-2">
                {(selectedOrder.seller_items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] text-xs font-bold">
                    <div>
                      <p className="font-black text-sm">{item.name}</p>
                      <p className="text-text-muted">Variant: {item.package_name || item.variant || "Standard"} × {item.quantity}</p>
                    </div>
                    <p className="font-black text-primary">₹{(item.subtotal || item.price * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-2xl bg-foreground/[0.03] p-4 border border-foreground/[0.06] space-y-1 text-xs font-bold">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Delivery Address</span>
              <p className="font-black text-sm">{selectedOrder.customer_name}</p>
              <p className="text-text-secondary">
                {typeof selectedOrder.shipping_address === "string" 
                  ? selectedOrder.shipping_address 
                  : selectedOrder.shipping_address?.address_line1 || selectedOrder.address || "Address details on invoice"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
