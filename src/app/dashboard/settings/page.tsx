"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { Building2, CreditCard, MapPin, Bell, Save, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    mobile_number: "",
    email: "",
    pickup_address: "",
    warehouse_address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
  });

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: seller } = await supabase
          .from("sellers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (seller) {
          setDeleteRequested(Boolean(seller.delete_requested));
          setDeleteDate(seller.delete_date || null);
          setForm({
            business_name: seller.business_name || "",
            owner_name: seller.owner_name || "",
            mobile_number: seller.mobile_number || "",
            email: seller.email || "",
            pickup_address: seller.pickup_address || "",
            warehouse_address: seller.warehouse_address || "",
            city: seller.city || "",
            state: seller.state || "",
            pincode: seller.pincode || "",
            gstin: seller.gstin || "",
            pan_number: seller.pan_number || "",
            bank_account_number: seller.bank_account_number || "",
            bank_ifsc: seller.bank_ifsc || "",
            bank_name: seller.bank_name || "",
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleRequestDeletion = async () => {
    if (!confirm("Are you sure you want to request account deletion? A mandatory 15-day hold period will begin.")) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const scheduledDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("sellers")
        .update({
          delete_requested: true,
          delete_date: scheduledDate,
          account_status: "Pending Delete"
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setDeleteRequested(true);
      setDeleteDate(scheduledDate);
      setStatusMsg("⚠️ Account deletion request submitted. Scheduled in 15 days.");
    } catch (err: any) {
      alert("Failed to submit deletion request: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sellers")
        .update({
          delete_requested: false,
          delete_date: null,
          account_status: "Active"
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setDeleteRequested(false);
      setDeleteDate(null);
      setStatusMsg("✅ Account deletion request canceled. Your account is active.");
    } catch (err: any) {
      alert("Failed to cancel deletion request: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sellers")
        .update({
          business_name: form.business_name,
          owner_name: form.owner_name,
          mobile_number: form.mobile_number,
          pickup_address: form.pickup_address,
          warehouse_address: form.warehouse_address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          gstin: form.gstin,
          pan_number: form.pan_number,
          bank_account_number: form.bank_account_number,
          bank_ifsc: form.bank_ifsc,
          bank_name: form.bank_name,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setStatusMsg("✅ Business profile & bank details saved successfully!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Merchant Settings</h1>
        <p className="text-xs font-bold text-text-secondary mt-1">
          Manage your registered business info, tax IDs, payout bank account, and pickup details.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 text-xs font-black text-emerald-700 dark:text-emerald-400">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile */}
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="text-primary" size={20} />
            <h2 className="text-base font-black">Business Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Business Name</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Owner Name</label>
              <input
                type="text"
                required
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Mobile Number</label>
              <input
                type="text"
                required
                value={form.mobile_number}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Registered Email (Read only)</label>
              <input
                type="email"
                disabled
                value={form.email}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-100/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-bold outline-none text-text-muted cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* GSTIN & Bank Details */}
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-primary" size={20} />
            <h2 className="text-base font-black">Tax & Bank Payout Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">GSTIN Number</label>
              <input
                type="text"
                placeholder="22AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">PAN Number</label>
              <input
                type="text"
                placeholder="ABCDE1234F"
                value={form.pan_number}
                onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Bank Account Number</label>
              <input
                type="text"
                placeholder="Account Number"
                value={form.bank_account_number}
                onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Bank IFSC Code</label>
              <input
                type="text"
                placeholder="SBIN0001234"
                value={form.bank_ifsc}
                onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pickup & Warehouse Address */}
        <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-primary" size={20} />
            <h2 className="text-base font-black">Pickup & Warehouse Address</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase text-text-muted mb-1 block">Pickup Address</label>
              <textarea
                rows={2}
                value={form.pickup_address}
                onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-text-muted mb-1 block">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-text-muted mb-1 block">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-text-muted mb-1 block">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-rose-600 dark:text-rose-400">Danger Zone: Account Deletion</h2>
              <p className="text-xs font-bold text-text-muted mt-0.5">
                Initiates a mandatory 15-day hold period before permanent seller account deletion.
              </p>
            </div>
          </div>

          {deleteRequested ? (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs font-bold text-rose-600 dark:text-rose-300 space-y-3">
              <p>
                ⚠️ <strong>Deletion Pending:</strong> Your seller account is scheduled for permanent deletion on{" "}
                <span className="font-black text-rose-500">
                  {deleteDate ? new Date(deleteDate).toLocaleDateString("en-IN", { dateStyle: "full" }) : "15 days"}
                </span>.
              </p>
              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition uppercase tracking-wider"
              >
                {deleting ? "Processing..." : "Cancel Deletion Request"}
              </button>
            </div>
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={deleting}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-rose-600/20 transition flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span>{deleting ? "Submitting Request..." : "Request 15-Day Account Deletion"}</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-wider shadow-xl hover:opacity-90 disabled:opacity-50"
        >
          <Save size={18} />
          <span>{saving ? "Saving Profile..." : "Save Merchant Settings"}</span>
        </button>
      </form>
    </div>
  );
}
