"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product } from "@shared/types";
import { 
  Package, 
  RefreshCw, 
  AlertTriangle,
  Check,
  TrendingDown,
  TrendingUp,
  History
} from "lucide-react";

export default function SellerInventory() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockChanges, setStockChanges] = useState<Record<number, number>>({});
  const [limits, setLimits] = useState<Record<number, number>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch products for seller
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("name", { ascending: true });

      const sProducts = (productsData || []) as Product[];
      setProducts(sProducts);

      // Initialize inputs state
      const initialStock: Record<number, number> = {};
      const initialLimits: Record<number, number> = {};
      sProducts.forEach(p => {
        initialStock[p.id] = p.stock || 0;
        initialLimits[p.id] = p.low_stock_limit || 5;
      });
      setStockChanges(initialStock);
      setLimits(initialLimits);

      // Fetch recent stock history for this seller's products
      const pIds = sProducts.map(p => p.id);
      if (pIds.length > 0) {
        const { data: historyData } = await supabase
          .from("stock_history")
          .select("*, products(name)")
          .in("product_id", pIds)
          .order("created_at", { ascending: false })
          .limit(10);
        setHistory(historyData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveStock = async (product: Product) => {
    const newStock = stockChanges[product.id];
    const newLimit = limits[product.id];

    if (newStock === undefined || newLimit === undefined) return;
    if (newStock < 0 || newLimit < 1) {
      alert("Stock must be 0 or more. Low stock limit must be 1 or more.");
      return;
    }

    setUpdatingId(product.id);
    setStatusMessage("");

    const currentStock = product.stock || 0;
    const changeAmount = newStock - currentStock;

    try {
      // 1. Update product stock details
      const { error: prodError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          low_stock_limit: newLimit,
          status: newStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"
        })
        .eq("id", product.id);

      if (prodError) throw prodError;

      // 2. Insert into stock history if stock changed
      if (changeAmount !== 0) {
        const { error: histError } = await supabase
          .from("stock_history")
          .insert({
            product_id: product.id,
            change_amount: changeAmount,
            reason: `Seller Portal Manual Update (New Stock: ${newStock})`
          });
        
        if (histError) console.error("Stock history insert error:", histError);
      }

      setStatusMessage(`✅ Updated stock for ${product.name}`);
      // Refresh local product list item
      setProducts(products.map(p => p.id === product.id ? { ...p, stock: newStock, low_stock_limit: newLimit, status: newStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK" } : p));
      setTimeout(() => setStatusMessage(""), 2500);

      // Refresh history list
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update stock.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Stock Inventory</h1>
          <p className="text-sm font-bold text-text-secondary mt-1">Manage stock availability and low-level alerts.</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 rounded-2xl border border-foreground/[0.08] px-5 py-3.5 text-sm font-black text-text-secondary hover:bg-foreground/[0.02]"
        >
          <History size={16} /> {showHistory ? "Show Inventory" : "View Stock Logs"}
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-700 text-xs font-black shadow-sm">
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          <span className="ml-3 text-sm font-bold text-text-muted">Loading inventory...</span>
        </div>
      ) : showHistory ? (
        /* History View */
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2"><History size={18} className="text-primary" /> Recent Stock Actions</h3>
          {history.length === 0 ? (
            <div className="rounded-3xl border border-foreground/[0.06] p-12 text-center text-text-muted">
              No stock history logged yet.
            </div>
          ) : (
            <div className="rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] overflow-hidden">
              <div className="divide-y divide-foreground/[0.04]">
                {history.map((log) => {
                  const isUp = log.change_amount > 0;
                  return (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-foreground/[0.005]">
                      <div className="space-y-1">
                        <p className="font-black text-sm">{log.products?.name || "Product"}</p>
                        <p className="text-xs text-text-muted font-bold">{log.reason}</p>
                        <p className="text-[10px] text-text-disabled font-bold">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 font-black text-sm ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isUp ? "+" : ""}{log.change_amount}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-foreground/[0.08] p-12 text-center text-text-muted">
          <Package size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-black text-foreground">No Products Found</h3>
          <p className="text-xs font-bold mt-1">Please add products in the Products page first to manage inventory.</p>
        </div>
      ) : (
        /* Grid of inventory management */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isLow = (product.stock || 0) <= (product.low_stock_limit || 5);
            return (
              <div 
                key={product.id} 
                className={`rounded-3xl border p-6 flex flex-col justify-between bg-foreground/[0.01] transition-all duration-300 ${
                  isLow 
                    ? "border-rose-500/20 bg-rose-500/[0.01] shadow-rose-900/5 shadow-md" 
                    : "border-foreground/[0.06] hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-10 w-10 rounded-lg object-cover border border-foreground/[0.08]"
                      />
                      <div>
                        <h3 className="font-black text-sm text-foreground truncate max-w-[150px]">{product.name}</h3>
                        <p className="text-[10px] font-bold text-text-muted mt-0.5">SKU: {product.sku || "N/A"}</p>
                      </div>
                    </div>
                    {isLow && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md animate-pulse">
                        <AlertTriangle size={10} /> Low Stock
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-6">
                    <div>
                      <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">Current Stock</span>
                      <input
                        type="number"
                        min="0"
                        value={stockChanges[product.id] ?? 0}
                        onChange={e => setStockChanges({...stockChanges, [product.id]: Number(e.target.value)})}
                        className="w-full rounded-xl border border-foreground/[0.1] bg-foreground/[0.01] px-3 py-2 text-sm font-black outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">Low Limit</span>
                      <input
                        type="number"
                        min="1"
                        value={limits[product.id] ?? 5}
                        onChange={e => setLimits({...limits, [product.id]: Number(e.target.value)})}
                        className="w-full rounded-xl border border-foreground/[0.1] bg-foreground/[0.01] px-3 py-2 text-sm font-black outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveStock(product)}
                  disabled={updatingId === product.id}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-black uppercase tracking-wider text-white hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {updatingId === product.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Save Changes
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
