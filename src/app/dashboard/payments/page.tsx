"use client";

import { useState, useEffect } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { apiService } from "@/services/apiService";
import { jsPDF } from "jspdf";
import { 
  CreditCard, 
  IndianRupee, 
  Download, 
  Clock, 
  CheckCircle2, 
  Eye, 
  X,
  FileText,
  RefreshCw,
  AlertCircle
} from "lucide-react";

type Settlement = {
  id: string;
  seller_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  total_orders: number;
  gross_sales: number;
  commission_deducted: number;
  platform_fees: number;
  taxes: number;
  net_amount: number;
  status: 'PENDING' | 'PAID';
  transaction_id?: string;
  payment_date?: string;
  receipt_number?: string;
  receipt_pdf_url?: string;
  notes?: string;
  email_sent: boolean;
  created_at: string;
};

export default function SellerPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [sellerId, setSellerId] = useState<string>("");
  const [sellerName, setSellerName] = useState<string>("");
  
  // Details Modal
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [settlementOrders, setSettlementOrders] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    availableBalance: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get seller profile id
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (seller) {
        setSellerId(seller.id);
        setSellerName(seller.business_name);
        
        // Fetch settlements
        const res = await apiService.getSellerSettlements(seller.id);
        if (res.success && res.data) {
          const sorted = (res.data || []) as Settlement[];
          setSettlements(sorted);
          calculateStats(sorted, seller.id);
        }
      }
    } catch (err) {
      console.error("Failed to load seller settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup realtime changes subscriptions
    const channel = supabase
      .channel("seller-settlement-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_settlements" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const calculateStats = async (data: Settlement[], sId: string) => {
    const paid = data.filter(s => s.status === "PAID").reduce((sum, s) => sum + Number(s.net_amount), 0);
    const pending = data.filter(s => s.status === "PENDING").reduce((sum, s) => sum + Number(s.net_amount), 0);
    
    // Get live available balance (delivered/completed orders not yet included in a paid settlement)
    try {
      const revRes = await apiService.getRevenueSummary(sId);
      if (revRes.success && revRes.data) {
        setStats({
          totalPaid: paid,
          totalPending: pending,
          availableBalance: Number(revRes.data.availableBalance || 0)
        });
      } else {
        setStats({
          totalPaid: paid,
          totalPending: pending,
          availableBalance: 0
        });
      }
    } catch (e) {
      setStats({
        totalPaid: paid,
        totalPending: pending,
        availableBalance: 0
      });
    }
  };

  const handleOpenDetails = async (s: Settlement) => {
    setSelectedSettlement(s);
    setModalLoading(true);
    setSettlementOrders([]);
    try {
      const res = await apiService.getSettlementDetails(s.id);
      if (res.success) {
        setSettlementOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadPDFReceipt = (s: Settlement) => {
    if (s.receipt_pdf_url) {
      window.open(s.receipt_pdf_url, "_blank");
    } else {
      // client-side generator fallback if storage link missing
      generateReceiptPDFFallback(s);
    }
  };

  const generateReceiptPDFFallback = (s: Settlement) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Branding Banner
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ASALISWAD MARKETPLACE", 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("WEEKLY SELLER SETTLEMENT RECEIPT (DUPLICATE)", 15, 25);

    // Header Right
    doc.setFont("helvetica", "bold");
    doc.text(`RECEIPT: ${s.receipt_number || "REC-PENDING"}`, 130, 18);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Paid: ${s.payment_date ? new Date(s.payment_date).toLocaleString() : "Pending"}`, 130, 25);

    // Seller & Settlement metadata
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("SELLER INFORMATION", 15, 50);
    doc.line(15, 52, 195, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Seller ID: ${s.seller_id}`, 15, 60);
    doc.text(`Business Name: ${sellerName}`, 15, 66);
    doc.text(`Settlement Week: Week ${s.week_number}`, 15, 72);
    doc.text(`Period Range: ${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()}`, 15, 78);
    doc.text(`Transaction Reference: ${s.transaction_id || "N/A"}`, 15, 84);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 100, 180, 50, "F");
    doc.rect(15, 100, 180, 50, "D");

    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL SUMMARY", 20, 108);

    doc.setFont("helvetica", "normal");
    doc.text(`Gross Sales Revenue:`, 20, 118);
    doc.text(`₹ ${s.gross_sales}`, 150, 118, { align: "right" });

    doc.text(`Marketplace Commission:`, 20, 124);
    doc.text(`- ₹ ${s.commission_deducted}`, 150, 124, { align: "right" });

    doc.text(`App Platform Fees:`, 20, 130);
    doc.text(`- ₹ ${s.platform_fees}`, 150, 130, { align: "right" });

    doc.text(`Taxes (GST):`, 20, 136);
    doc.text(`- ₹ ${s.taxes}`, 150, 136, { align: "right" });

    // Net
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`NET DISBURSED AMOUNT:`, 20, 144);
    doc.text(`₹ ${s.net_amount}`, 150, 144, { align: "right" });

    doc.save(`Receipt_Week_${s.week_number}_${sellerName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settlements Ledger</h1>
          <p className="text-xs font-bold text-text-muted">Review weekly payout calendars, download transaction receipts, and view live earnings.</p>
        </div>
        <button onClick={loadData} className="btn bg-foreground/[0.02] border border-foreground/[0.08] text-text-primary text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-foreground/[0.04]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-foreground/[0.02] border border-foreground/[0.06] p-6 rounded-3xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-text-muted">Total Settled (Paid)</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">₹{stats.totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-foreground/[0.02] border border-foreground/[0.06] p-6 rounded-3xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-text-muted">Pending Payouts</p>
          <p className="text-3xl font-black text-amber-600 mt-2">₹{stats.totalPending.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-foreground/[0.02] border border-foreground/[0.06] p-6 rounded-3xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-text-muted">Available Payout Balance</p>
          <p className="text-3xl font-black text-text-primary mt-2">₹{stats.availableBalance.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Settlement Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-text-muted font-bold text-xs flex justify-center items-center gap-2">
          <RefreshCw className="animate-spin" size={16} /> Retrieving payment weeks...
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-12 text-text-muted font-bold text-xs bg-foreground/[0.02] rounded-3xl border border-foreground/[0.06]">
          No settlements periods have generated yet for your account.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settlements.map((s) => {
            const isLocked = s.status === "PENDING" && s.week_number > 1 && 
              settlements.some(other => other.week_number < s.week_number && other.status === "PENDING");
            
            return (
              <div 
                key={s.id} 
                className={`bg-foreground/[0.02] border rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                  s.status === "PAID" 
                    ? "border-emerald-600/20" 
                    : isLocked 
                      ? "border-foreground/[0.04] opacity-60" 
                      : "border-amber-600/20"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Week {s.week_number}</span>
                    {s.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[9px] font-black uppercase">
                        <CheckCircle2 size={10} /> Disbursed
                      </span>
                    ) : isLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] text-text-muted px-2.5 py-1 text-[9px] font-black uppercase">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-1 text-[9px] font-black uppercase">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-text-muted">
                    {new Date(s.start_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(s.end_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </h3>

                  <div className="my-4">
                    <p className="text-[10px] font-black uppercase text-text-muted">Net Payout</p>
                    <p className="text-2xl font-black text-text-primary">₹{Number(s.net_amount).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 border-t border-foreground/[0.06] pt-4">
                  {s.status === "PAID" ? (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>Payment Completed. Check your email for your settlement receipt.</span>
                    </div>
                  ) : isLocked ? (
                    <div className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Locked until earlier weeks are paid.</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      <Clock size={12} className="shrink-0" />
                      <span>Disbursements are processed weekly.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenDetails(s)} 
                      className="flex-1 bg-foreground/[0.04] text-text-primary text-xs font-black py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1 hover:bg-foreground/[0.08] transition-all"
                    >
                      <Eye size={12} /> View Details
                    </button>
                    {s.status === "PAID" && (
                      <button 
                        onClick={() => handleDownloadPDFReceipt(s)} 
                        className="bg-primary text-white text-xs font-black p-2.5 rounded-2xl flex items-center justify-center hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
                        title="Download Receipt"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-background border border-foreground/[0.08] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center bg-foreground/[0.02] px-6 py-4 border-b border-foreground/[0.06]">
              <div>
                <h3 className="text-sm font-black uppercase">Settlement breakdown</h3>
                <p className="text-[10px] text-text-muted font-mono">{selectedSettlement.id}</p>
              </div>
              <button onClick={() => setSelectedSettlement(null)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Financial Breakdown Card */}
              <div className="bg-foreground/[0.02] p-5 border border-foreground/[0.06] rounded-3xl space-y-3 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-text-muted">Gross Sales Revenue</span>
                  <span className="text-text-primary font-mono">₹{Number(selectedSettlement.gross_sales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Marketplace Commission Deducted</span>
                  <span className="font-mono">-₹{Number(selectedSettlement.commission_deducted).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>App Platform Fees Deducted</span>
                  <span className="font-mono">-₹{Number(selectedSettlement.platform_fees).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Taxes (GST) Deducted</span>
                  <span className="font-mono">-₹{Number(selectedSettlement.taxes).toFixed(2)}</span>
                </div>
                <hr className="border-foreground/[0.06] my-2" />
                <div className="flex justify-between font-black text-sm text-emerald-600">
                  <span>Net Disbursed Settlement</span>
                  <span className="font-mono">₹{Number(selectedSettlement.net_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Order List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-text-muted block border-b border-foreground/[0.06] pb-2">Included Orders ({settlementOrders.length})</h4>
                {modalLoading ? (
                  <div className="text-center py-4 font-bold text-text-muted text-[10px]">Loading orders list...</div>
                ) : settlementOrders.length === 0 ? (
                  <div className="text-center py-4 text-text-muted text-xs font-bold bg-foreground/[0.02] rounded-2xl">No orders fall within this cycle yet.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {settlementOrders.map(o => (
                      <div key={o.id} className="flex justify-between items-center p-3 border border-foreground/[0.06] rounded-2xl text-xs font-bold">
                        <div>
                          <span className="block text-text-primary">Order #{o.order_number}</span>
                          <span className="text-[10px] text-text-muted font-medium">{new Date(o.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono text-text-primary">₹{Number(o.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Details info (only if Paid) */}
              {selectedSettlement.status === "PAID" && (
                <div className="bg-emerald-500/5 p-4 border border-emerald-500/10 rounded-2xl text-xs font-bold space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Payment References</h4>
                  <div className="grid grid-cols-2 gap-2 text-text-muted">
                    <div>
                      <p>Receipt Number:</p>
                      <p className="text-text-primary font-mono">{selectedSettlement.receipt_number}</p>
                    </div>
                    <div>
                      <p>PhonePe Txn ID:</p>
                      <p className="text-text-primary font-mono">{selectedSettlement.transaction_id}</p>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-foreground/[0.04]">
                      <p>Disbursement Date:</p>
                      <p className="text-text-primary">{new Date(selectedSettlement.payment_date || "").toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-foreground/[0.06] bg-foreground/[0.02]">
              <button onClick={() => setSelectedSettlement(null)} className="w-full py-2.5 rounded-2xl border border-foreground/[0.08] text-text-secondary text-xs font-black hover:bg-foreground/[0.04]">
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
