"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  History, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Check, 
  Sparkles,
  Smartphone,
  QrCode
} from "lucide-react";
import type { SellerSettlement, SellerPaymentDetails } from "@/shared/types/settlements";

export default function SellerPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [sellerUser, setSellerUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<SellerSettlement[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<SellerPaymentDetails>({
    upi_id: "",
    payment_method: "PhonePe",
    account_name: "",
    phone_number: ""
  });
  const [saveStatus, setSaveStatus] = useState("");
  const [commissionRate, setCommissionRate] = useState(10); // default 10% platform commission

  useEffect(() => {
    async function loadPaymentData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setSellerUser(user);
          
          // Load saved payment details from local storage or profile
          const storedConfig = localStorage.getItem(`seller_payment_config_${user.id}`);
          if (storedConfig) {
            try {
              setPaymentConfig(JSON.parse(storedConfig));
            } catch (e) {
              console.error("Error parsing stored payment config", e);
            }
          } else if (user.user_metadata?.upi_id) {
            setPaymentConfig({
              upi_id: user.user_metadata.upi_id || "",
              payment_method: user.user_metadata.payment_method || "PhonePe",
              account_name: user.user_metadata.full_name || "",
              phone_number: user.phone || user.user_metadata.phone || ""
            });
          }

          // Load delivered orders for revenue calculation
          const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });
          
          setOrders(ordersData || []);

          // Load settlements from Supabase table or local state
          const { data: setRes, error: setErr } = await supabase
            .from("seller_settlements")
            .select("*")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false });

          if (!setErr && setRes && setRes.length > 0) {
            setSettlements(setRes);
          } else {
            // Check localStorage fallback for settlements
            const localSets = localStorage.getItem(`seller_settlements_${user.id}`);
            if (localSets) {
              setSettlements(JSON.parse(localSets));
            }
          }
        }
      } catch (err) {
        console.error("Error loading seller payments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentData();
  }, []);

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfig.upi_id) {
      setSaveStatus("❌ Please enter a valid UPI ID or PhonePe Number");
      return;
    }

    if (sellerUser) {
      localStorage.setItem(`seller_payment_config_${sellerUser.id}`, JSON.stringify(paymentConfig));
      
      // Update Supabase user metadata if possible
      try {
        await supabase.auth.updateUser({
          data: {
            upi_id: paymentConfig.upi_id,
            payment_method: paymentConfig.payment_method
          }
        });
      } catch (e) {
        console.warn("Could not save metadata to auth provider:", e);
      }
    }

    setSaveStatus("✅ UPI & PhonePe payout details saved successfully!");
    setTimeout(() => setSaveStatus(""), 4000);
  };

  // Financial Metrics Calculations
  const deliveredOrders = orders.filter(o => o.order_status === "DELIVERED" || o.order_status === "SHIPPED");
  const totalGrossEarnings = deliveredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalCommissionDeducted = totalGrossEarnings * (commissionRate / 100);
  const netEarnings = totalGrossEarnings - totalCommissionDeducted;

  const totalPaidSettlements = settlements
    .filter(s => s.status === "PAID")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const pendingSettlementAmount = Math.max(0, netEarnings - totalPaidSettlements);

  // Statement CSV Downloader
  const handleDownloadStatement = () => {
    const csvRows = [
      ["Asali Swad Seller Financial Statement"],
      [`Seller Email: ${sellerUser?.email || "N/A"}`],
      [`Generated Date: ${new Date().toLocaleDateString("en-IN")}`],
      [""],
      ["Metric", "Amount (INR)"],
      ["Total Delivered Revenue", totalGrossEarnings.toFixed(2)],
      [`Platform Commission (${commissionRate}%)`, totalCommissionDeducted.toFixed(2)],
      ["Net Seller Earnings", netEarnings.toFixed(2)],
      ["Total Paid Settlements", totalPaidSettlements.toFixed(2)],
      ["Pending Balance Payout", pendingSettlementAmount.toFixed(2)],
      [""],
      ["Settlement History"],
      ["Settlement ID", "Date", "Amount", "Method", "UPI ID", "UTR Reference", "Status"],
      ...settlements.map(s => [
        s.id,
        new Date(s.created_at).toLocaleDateString("en-IN"),
        s.amount,
        s.payment_method,
        s.upi_id,
        s.utr_number || "N/A",
        s.status
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Seller_Financial_Statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <p className="text-sm font-bold text-text-muted animate-pulse">Loading payout & financial ledger...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Merchant Financial Desk</span>
          <h1 className="text-2xl font-black tracking-tight text-text-primary mt-1">Payouts & Settlement Ledger</h1>
          <p className="text-xs font-medium text-text-muted mt-1">
            Configure your UPI / PhonePe receiver credentials and monitor manual settlement transfers.
          </p>
        </div>

        <button
          onClick={handleDownloadStatement}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-foreground/[0.05] hover:bg-foreground/[0.1] text-text-primary font-bold text-xs transition-colors"
        >
          <Download size={16} />
          Download Statement (CSV)
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Gross Earnings</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-text-primary mt-2">₹{totalGrossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-text-muted mt-1 font-medium">{deliveredOrders.length} Delivered Orders</p>
        </div>

        <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Pending Settlement</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">₹{pendingSettlementAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-emerald-700/70 mt-1 font-medium">Queued for Super Admin transfer</p>
        </div>

        <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Total Settled (Paid)</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">₹{totalPaidSettlements.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-blue-700/70 mt-1 font-medium">Transferred via UPI/PhonePe</p>
        </div>

        <div className="p-6 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Marketplace Commission</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-text-primary mt-2">{commissionRate}%</p>
          <p className="text-[10px] text-text-muted mt-1 font-medium">Deducted on payout (₹{totalCommissionDeducted.toFixed(2)})</p>
        </div>
      </div>

      {/* UPI / PhonePe Receiver Settings */}
      <div className="p-6 md:p-8 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-text-primary">PhonePe & UPI Settlement Receiver</h2>
            <p className="text-xs font-medium text-text-muted">Enter your active UPI ID or PhonePe registered mobile number where Super Admin will send settlements.</p>
          </div>
        </div>

        {saveStatus && (
          <div className={`p-4 rounded-2xl text-xs font-bold ${saveStatus.includes("✅") ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
            {saveStatus}
          </div>
        )}

        <form onSubmit={handleSavePaymentConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-text-muted block mb-1">Preferred Transfer Method</label>
            <select
              value={paymentConfig.payment_method}
              onChange={(e) => setPaymentConfig((prev: SellerPaymentDetails) => ({ ...prev, payment_method: e.target.value as any }))}
              className="w-full h-12 rounded-2xl border border-foreground/10 bg-background px-4 text-xs font-bold text-text-primary outline-none focus:border-primary"
            >
              <option value="PhonePe">PhonePe Mobile Number / UPI</option>
              <option value="UPI">Google Pay / Generic UPI ID</option>
              <option value="GPay">GPay (Google Pay)</option>
              <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-text-muted block mb-1">UPI ID or PhonePe Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210@ybl or merchant@upi"
              value={paymentConfig.upi_id}
              onChange={(e) => setPaymentConfig((prev: SellerPaymentDetails) => ({ ...prev, upi_id: e.target.value }))}
              className="w-full h-12 rounded-2xl border border-foreground/10 bg-background px-4 text-xs font-bold text-text-primary outline-none focus:border-primary placeholder:text-text-muted/50"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Save Settlement Details
            </button>
          </div>
        </form>
      </div>

      {/* Settlement History Table */}
      <div className="p-6 md:p-8 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-text-primary">Settlement Payout History</h2>
            <p className="text-xs font-medium text-text-muted">Recorded manual payouts from Super Admin with transaction UTR numbers.</p>
          </div>
          <span className="text-xs font-bold text-text-muted">{settlements.length} Transfers Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-foreground/[0.06] text-[10px] font-black uppercase tracking-widest text-text-muted">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Transfer Method</th>
                <th className="py-3 px-4">Target UPI ID</th>
                <th className="py-3 px-4">UTR / Transaction Ref</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.04] text-xs font-bold text-text-primary">
              {settlements.map((item) => (
                <tr key={item.id} className="hover:bg-foreground/[0.01]">
                  <td className="py-3 px-4 text-text-muted font-medium">
                    {new Date(item.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-600">
                    ₹{Number(item.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    <span className="px-2.5 py-1 rounded-full bg-foreground/[0.05] text-[10px] font-black uppercase tracking-wider">
                      {item.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {item.upi_id}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-primary">
                    {item.utr_number || "Pending Transfer"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}

              {settlements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted font-medium">
                    No settlement transfers logged yet. Pending balances will be transferred by Super Admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
