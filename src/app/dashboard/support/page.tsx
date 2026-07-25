"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { Plus } from "lucide-react";

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
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Help Center & Support</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Raise support tickets or read merchant guides and seller policies.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus size={16} />
          Raise Support Ticket
        </button>
      </div>

      {/* FAQs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">📦 How do product approvals work?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Once added, products are immediately visible unless flagged for prohibited content review by Super Admin.
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">💳 When are seller payouts settled?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Payouts are settled directly to your registered bank account every Tuesday for delivered orders.
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">🚚 How do I request pickup dispatch?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Mark order as Ready for Dispatch in your Orders tab to generate shipment labels and schedule pickup.
          </p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Your Support Tickets
        </h2>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No support tickets raised yet.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                  {t.response && (
                    <div className="mt-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <strong>Admin Response:</strong> {t.response}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-slate-900 dark:text-slate-100">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Raise Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="payouts">Payouts & Billing</option>
                    <option value="orders">Order Dispatch</option>
                    <option value="technical">Technical Issue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your query or issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
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
