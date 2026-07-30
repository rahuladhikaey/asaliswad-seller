"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import {
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Smartphone,
  IndianRupee,
  BarChart3,
  RefreshCw
} from "lucide-react";
import type { SellerSettlement, SellerPaymentDetails } from "@/shared/types/settlements";

type PeriodKey = "daily" | "weekly" | "monthly" | "yearly";

function getDateRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);

  switch (period) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "weekly": {
      const day = now.getDay(); // 0 = Sunday
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end: endM };
    }
    case "yearly": {
      const start = new Date(now.getFullYear(), 0, 1);
      const endY = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end: endY };
    }
  }
}

function formatPeriodLabel(period: PeriodKey): string {
  const { start, end } = getDateRange(period);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  switch (period) {
    case "daily":   return `Today, ${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    case "weekly":  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
    case "monthly": return start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    case "yearly":  return `FY ${start.getFullYear()}`;
  }
}

export default function SellerEarningsPage() {
  const [loading, setLoading]               = useState(true);
  const [sellerUser, setSellerUser]         = useState<any>(null);
  const [allOrders, setAllOrders]           = useState<any[]>([]);
  const [settlements, setSettlements]       = useState<SellerSettlement[]>([]);
  const [period, setPeriod]                 = useState<PeriodKey>("weekly");
  const [paymentConfig, setPaymentConfig]   = useState<SellerPaymentDetails>({
    upi_id: "", payment_method: "PhonePe", account_name: "", phone_number: ""
  });
  const [saveStatus, setSaveStatus]         = useState("");
  const [commissionRate, setCommissionRate] = useState(10);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setSellerUser(user);

      // Payment config
      const storedConfig = localStorage.getItem(`seller_payment_config_${user.id}`);
      if (storedConfig) {
        try { setPaymentConfig(JSON.parse(storedConfig)); } catch (_) {}
      } else if (user.user_metadata?.upi_id) {
        setPaymentConfig({
          upi_id: user.user_metadata.upi_id || "",
          payment_method: user.user_metadata.payment_method || "PhonePe",
          account_name: user.user_metadata.full_name || "",
          phone_number: user.phone || user.user_metadata.phone || ""
        });
      }

      // Orders (all; we filter client-side by period)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total_amount, order_status, created_at, seller_id, payment_status")
        .order("created_at", { ascending: false });

      setAllOrders(ordersData || []);

      // Commission rate from admin config (sellers table or global config)
      const { data: sellerRow } = await supabase
        .from("sellers")
        .select("commission_rate")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sellerRow?.commission_rate) setCommissionRate(Number(sellerRow.commission_rate));

      // Settlements – real-time subscription keeps this fresh
      const { data: setRes } = await supabase
        .from("seller_settlements")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setSettlements(setRes || []);
    } catch (err) {
      console.error("Error loading seller earnings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Realtime – whenever admin marks a settlement paid, this updates
    const channel = supabase
      .channel("seller-earnings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_settlements" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ─── Derived Earnings ─── */
  const { start, end } = getDateRange(period);

  const periodOrders = allOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= start && d <= end &&
      (o.order_status === "DELIVERED" || o.order_status === "delivered" ||
       o.order_status === "SHIPPED"   || o.order_status === "shipped");
  });

  const grossEarnings       = periodOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const commissionDeducted  = grossEarnings * (commissionRate / 100);
  const netEarnings         = grossEarnings - commissionDeducted;

  // All-time for the settlement ledger denominator
  const allDelivered        = allOrders.filter(o =>
    o.order_status === "DELIVERED" || o.order_status === "delivered" ||
    o.order_status === "SHIPPED"   || o.order_status === "shipped"
  );
  const allTimeGross        = allDelivered.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const allTimeNet          = allTimeGross * (1 - commissionRate / 100);
  const totalPaid           = settlements.filter(s => s.status === "PAID").reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const pendingBalance      = Math.max(0, allTimeNet - totalPaid);

  /* ─── UPI Save ─── */
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfig.upi_id) { setSaveStatus("❌ Please enter a valid UPI ID or PhonePe Number"); return; }
    if (sellerUser) {
      localStorage.setItem(`seller_payment_config_${sellerUser.id}`, JSON.stringify(paymentConfig));
      try {
        await supabase.from("sellers").update({ upi_id: paymentConfig.upi_id, phonepay_no: paymentConfig.upi_id, updated_at: new Date().toISOString() }).eq("user_id", sellerUser.id);
      } catch (_) {}
      try { await supabase.auth.updateUser({ data: { upi_id: paymentConfig.upi_id, payment_method: paymentConfig.payment_method } }); } catch (_) {}
    }
    setSaveStatus("✅ UPI & PhonePe payout details saved successfully!");
    setTimeout(() => setSaveStatus(""), 4000);
  };

  /* ─── CSV Download ─── */
  const handleDownloadStatement = () => {
    const rows = [
      ["ASALISWAD Seller Earnings Statement"],
      [`Seller: ${sellerUser?.email || "N/A"}`],
      [`Period: ${formatPeriodLabel(period)}`],
      [`Generated: ${new Date().toLocaleDateString("en-IN")}`],
      [""],
      ["Metric", "Amount (INR)"],
      ["Gross Earnings (period)", grossEarnings.toFixed(2)],
      [`Commission (${commissionRate}%)`, commissionDeducted.toFixed(2)],
      ["Net Earnings (period)", netEarnings.toFixed(2)],
      ["All-Time Pending Balance", pendingBalance.toFixed(2)],
      [""],
      ["Settlement History"],
      ["Week", "Date", "Amount", "Method", "UTR", "Status"],
      ...settlements.map((s, i) => [
        `Week ${settlements.length - i}`,
        new Date(s.created_at).toLocaleDateString("en-IN"),
        s.amount, s.payment_method, s.utr_number || "N/A", s.status
      ])
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Earnings_${period}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          <p className="text-xs font-bold text-text-muted animate-pulse">Loading your earnings ledger...</p>
        </div>
      </div>
    );
  }

  const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
    { key: "daily",   label: "Today" },
    { key: "weekly",  label: "This Week" },
    { key: "monthly", label: "This Month" },
    { key: "yearly",  label: "This Year" }
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Merchant Earnings</span>
          <h1 className="text-2xl font-black tracking-tight text-text-primary mt-1">Income & Settlement Ledger</h1>
          <p className="text-xs font-medium text-text-muted mt-1">
            Track gross income across daily, weekly, monthly & yearly periods. Settlements auto-update when Super Admin pays.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground/[0.05] hover:bg-foreground/[0.1] text-text-primary font-bold text-xs transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleDownloadStatement}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground/[0.05] hover:bg-foreground/[0.1] text-text-primary font-bold text-xs transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Period Toggle Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
              period === t.key
                ? "bg-primary text-white shadow-primary/20 shadow-md"
                : "bg-foreground/[0.04] border border-foreground/[0.08] text-text-muted hover:text-text-primary hover:bg-foreground/[0.08]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Period Label ── */}
      <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
        <CalendarDays size={14} className="text-primary" />
        <span>Showing earnings for: <strong className="text-text-primary">{formatPeriodLabel(period)}</strong></span>
      </div>

      {/* ── SINGLE Gross Earnings Hero Card ── */}
      <div className="rounded-[2.5rem] bg-gradient-to-br from-primary via-emerald-700 to-emerald-950 p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
        {/* decorative blob */}
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <IndianRupee size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Total Gross Earnings</span>
          </div>
          <p className="text-5xl font-black tracking-tight">
            ₹{grossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-bold opacity-70 mt-2">
            {periodOrders.length} delivered order{periodOrders.length !== 1 ? "s" : ""} · {formatPeriodLabel(period)}
          </p>

          {/* Mini breakdown */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Commission ({commissionRate}%)</p>
              <p className="text-lg font-black">₹{commissionDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Net Earnings</p>
              <p className="text-lg font-black text-emerald-300">₹{netEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Pending Balance</p>
              <p className="text-lg font-black text-amber-300">₹{pendingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── UPI / PhonePe Receiver Settings ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] space-y-5">
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
              onChange={(e) => setPaymentConfig(p => ({ ...p, payment_method: e.target.value as any }))}
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
              onChange={(e) => setPaymentConfig(p => ({ ...p, upi_id: e.target.value }))}
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

      {/* ── Weekly Settlement History Table ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-foreground/[0.02] border border-foreground/[0.06] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-text-primary flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Weekly Settlement Payout History
            </h2>
            <p className="text-xs font-medium text-text-muted mt-0.5">
              Auto-updated when Super Admin marks weekly payment as completed.
            </p>
          </div>
          <span className="text-xs font-bold text-text-muted shrink-0">{settlements.length} Transfers Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-foreground/[0.06] text-[10px] font-black uppercase tracking-widest text-text-muted">
                <th className="py-3 px-4">Week</th>
                <th className="py-3 px-4">Date Paid</th>
                <th className="py-3 px-4">Gross Amount</th>
                <th className="py-3 px-4">Net Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">UTR / Transaction Ref</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.04] text-xs font-bold text-text-primary">
              {settlements.map((item, idx) => {
                const grossAmt = Number(item.amount) || 0;
                const netAmt   = grossAmt * (1 - commissionRate / 100);
                return (
                  <tr key={item.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-black text-primary">
                      Week {settlements.length - idx}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-medium">
                      {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 font-black text-text-primary">
                      ₹{grossAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-600">
                      ₹{netAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-foreground/[0.05] text-[10px] font-black uppercase tracking-wider">
                        {item.payment_method || "PhonePe"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-primary">
                      {item.utr_number || <span className="text-text-muted italic font-medium">Pending Transfer</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 size={10} /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {settlements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp size={32} className="text-text-muted/30" />
                      <p className="text-text-muted font-bold text-xs">No settlement transfers logged yet.</p>
                      <p className="text-text-muted/60 font-medium text-[11px]">Pending balances will be transferred by Super Admin every week.</p>
                    </div>
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
