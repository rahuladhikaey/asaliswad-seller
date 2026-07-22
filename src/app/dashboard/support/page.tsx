"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { HelpCircle, Plus, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";

export default function SellerSupport() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (seller) {
        const { data } = await supabase
          .from("seller_support_tickets")
          .select("*")
          .eq("seller_id", seller.id)
          .order("created_at", { ascending: false });

        setTickets(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (seller) {
        const { error } = await supabase.from("seller_support_tickets").insert({
          seller_id: seller.id,
          subject,
          category,
          description,
          priority,
          status: "open",
        });

        if (error) throw error;
        setShowCreateModal(false);
        setSubject("");
        setDescription("");
        loadTickets();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit support ticket.");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Help Center & Support</h1>
          <p className="text-xs font-bold text-text-secondary mt-1">
            Raise support tickets or read merchant guides and seller policies.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90"
        >
          <Plus size={16} />
          Raise Support Ticket
        </button>
      </div>

      {/* FAQs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 space-y-2">
          <h3 className="text-sm font-black">📦 How do product approvals work?</h3>
          <p className="text-xs font-bold text-text-secondary">
            Once added, products are immediately visible unless flagged for prohibited content review by Super Admin.
          </p>
        </div>
        <div className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 space-y-2">
          <h3 className="text-sm font-black">💳 When are seller payouts settled?</h3>
          <p className="text-xs font-bold text-text-secondary">
            Payouts are settled directly to your registered bank account every Tuesday for delivered orders.
          </p>
        </div>
        <div className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 space-y-2">
          <h3 className="text-sm font-black">🚚 How do I request pickup dispatch?</h3>
          <p className="text-xs font-bold text-text-secondary">
            Go to the Shipping section, select an order, assign an AWB, and print your shipping label.
          </p>
        </div>
      </div>

      {/* Support Ticket History */}
      <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-lg font-black tracking-tight">Your Support Tickets</h2>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-xs font-bold">
            No support tickets raised yet. Click "Raise Support Ticket" above if you need assistance.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-3xl bg-foreground/[0.03] border border-foreground/[0.06] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-bold"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{t.subject}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black bg-primary/10 text-primary">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-text-secondary mt-1">{t.description}</p>
                  {t.response && (
                    <div className="mt-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      <strong>Admin Response:</strong> {t.response}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] font-bold text-text-muted">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-background border border-foreground/[0.08] p-6 md:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-black">Raise Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-text-muted block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-text-muted block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="payouts">Payouts & Billing</option>
                    <option value="orders">Order Dispatch</option>
                    <option value="technical">Technical Issue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-text-muted block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-text-muted block mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your query or issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 rounded-2xl border border-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
