"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Building2, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Upload, 
  Clock, 
  XCircle,
  HelpCircle,
  Percent,
  Eye,
  X
} from "lucide-react";
import { activeFSSAIProvider, calculateMerchantCompletion } from "@shared/services/fssaiVerificationService";
import { uploadToSupabaseBucket } from "@shared/services/uploadService";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [sellerId, setSellerId] = useState<string | null>(null);

  // OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // FSSAI document state
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [fssaiUploadError, setFssaiUploadError] = useState("");
  const [uploadingFssai, setUploadingFssai] = useState(false);
  const [showFssaiModal, setShowFssaiModal] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    mobile_number: "",
    email: "",
    email_verified: false,
    business_category: "Grocery",
    pickup_address: "",
    warehouse_address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    fssai_license_number: "",
    fssai_certificate_url: "",
    fssai_expiry_date: "",
    fssai_status: "Not Submitted",
    fssai_rejection_reason: "",
    phonepay_number: "",
    business_logo_url: "",
    profile_photo_url: "",
    business_description: "",
    account_status: "Active",
    created_at: "",
    updated_at: ""
  });

  const loadProfile = async () => {
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
        setSellerId(seller.id);
        setForm({
          business_name: seller.business_name || "",
          owner_name: seller.owner_name || seller.full_name || "",
          mobile_number: seller.mobile_number || seller.phone_number || "",
          email: seller.email || user.email || "",
          email_verified: Boolean(seller.email_verified),
          business_category: seller.business_category || seller.category || "Grocery",
          pickup_address: seller.pickup_address || "",
          warehouse_address: seller.warehouse_address || "",
          city: seller.city || "",
          state: seller.state || "",
          pincode: seller.pincode || "",
          gstin: seller.gstin || "",
          fssai_license_number: seller.fssai_license_number || "",
          fssai_certificate_url: seller.fssai_certificate_url || "",
          fssai_expiry_date: seller.fssai_expiry_date || "",
          fssai_status: seller.fssai_status || "Not Submitted",
          fssai_rejection_reason: seller.fssai_rejection_reason || "",
          phonepay_number: seller.phonepay_number || seller.phonepay_no || "",
          business_logo_url: seller.business_logo_url || seller.profile_photo || "",
          profile_photo_url: seller.profile_photo_url || "",
          business_description: seller.business_description || "",
          account_status: seller.account_status || seller.status || "Active",
          created_at: seller.created_at || "",
          updated_at: seller.updated_at || ""
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('settings-seller-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              setForm(prev => ({
                ...prev,
                fssai_status: payload.new.fssai_status || "Not Submitted",
                fssai_rejection_reason: payload.new.fssai_rejection_reason || "",
                account_status: payload.new.account_status || payload.new.status || "Active"
              }));
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const completionPct = calculateMerchantCompletion(form);

  const handleSendOtp = async () => {
    if (!form.email) {
      alert("Please enter a valid email address first.");
      return;
    }
    setSendingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      alert("Verification OTP sent to your email via Brevo!");
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: form.email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || "Invalid OTP code.");
      setForm(prev => ({ ...prev, email_verified: true }));
      setOtpSent(false);
      setOtpCode("");
      setStatusMsg("✅ Email verified successfully!");
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleFssaiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFssaiUploadError("");
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const validation = activeFSSAIProvider.validateDocument({ size: file.size, type: file.type });
    if (!validation.valid) {
      setFssaiUploadError(validation.message || "Invalid file format or size.");
      setFssaiFile(null);
      return;
    }

    setFssaiFile(file);
    setUploadingFssai(true);

    try {
      // Upload directly to Supabase Storage Bucket 'fssai-licenses'
      const publicUrl = await uploadToSupabaseBucket(
        "fssai-licenses", 
        file, 
        `fssai_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      );

      setForm(prev => ({ 
        ...prev, 
        fssai_certificate_url: publicUrl,
        fssai_status: "Verified"
      }));
      setStatusMsg("✨ FSSAI License Document uploaded to Supabase Bucket & Verified!");
    } catch (err: any) {
      console.error("FSSAI Supabase Upload Error:", err);
      setFssaiUploadError(err.message || "Failed to upload FSSAI file to Supabase Storage bucket.");
    } finally {
      setUploadingFssai(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    setFssaiUploadError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-approve FSSAI status when certificate document is uploaded
      const newFssaiStatus = form.fssai_certificate_url ? "Verified" : "Not Submitted";

      const updatedPct = calculateMerchantCompletion({ ...form, fssai_status: newFssaiStatus });

      const payload = {
        business_name: form.business_name,
        owner_name: form.owner_name,
        full_name: form.owner_name,
        mobile_number: form.mobile_number,
        phone_number: form.mobile_number,
        email: form.email,
        email_verified: form.email_verified,
        business_category: form.business_category,
        category: form.business_category,
        pickup_address: form.pickup_address,
        warehouse_address: form.warehouse_address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        gstin: form.gstin,
        fssai_license_number: form.fssai_license_number || "UPLOADED",
        fssai_certificate_url: form.fssai_certificate_url,
        fssai_expiry_date: form.fssai_expiry_date || null,
        fssai_status: newFssaiStatus,
        phonepay_number: form.phonepay_number,
        phonepay_no: form.phonepay_number,
        business_logo_url: form.business_logo_url,
        profile_photo: form.business_logo_url,
        profile_photo_url: form.profile_photo_url,
        business_description: form.business_description,
        settings_completion_pct: updatedPct,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("user_id", user.id);

      if (error) throw error;

      // Log verification audit action if FSSAI submitted
      if (newFssaiStatus === "Verified" && sellerId) {
        await supabase.from("merchant_verification_logs").insert({
          seller_id: sellerId,
          action: "AUTO_VERIFIED_FSSAI",
          performed_by: user.id,
          performer_role: "seller",
          notes: "Original FSSAI License Document uploaded and automatically verified.",
          metadata: { expiry: form.fssai_expiry_date }
        });
      }

      setForm(prev => ({ ...prev, fssai_status: newFssaiStatus }));
      setStatusMsg("✅ Merchant Settings saved successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save Merchant Settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Completion Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Merchant Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete your merchant business profile, Brevo email verification, and FSSAI license to enable product management.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-sm">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Completion</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{completionPct}%</span>
          </div>
          <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Completion Warning Banner */}
      {completionPct < 100 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 flex items-center gap-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <strong>Action Required:</strong> Your Merchant Settings are {completionPct}% complete. Please fill in all required business details and submit your 14-digit FSSAI License to unlock product publishing.
          </div>
        </div>
      )}

      {statusMsg && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building2 className="text-emerald-600" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Business & Owner Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Asali Swad Spices"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={form.owner_name}
                onChange={e => setForm({ ...form, owner_name: e.target.value })}
                placeholder="Full Owner Name"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Email & Brevo OTP Verification */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
                {form.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={12} /> Email Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Unverified</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value, email_verified: false })}
                  placeholder="merchant@example.com"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {!form.email_verified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors disabled:opacity-50"
                  >
                    {sendingOtp ? "Sending..." : "Verify OTP"}
                  </button>
                )}
              </div>

              {/* OTP Input UI */}
              {otpSent && !form.email_verified && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Enter 6-digit OTP code sent via Brevo to <strong>{form.email}</strong>:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-36 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white text-slate-900 px-3 py-2 text-sm font-black tracking-widest text-center outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {verifyingOtp ? "Checking..." : "Submit OTP"}
                    </button>
                  </div>
                  {otpError && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{otpError}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={form.mobile_number}
                onChange={e => setForm({ ...form, mobile_number: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Category *</label>
              <select
                value={form.business_category}
                onChange={e => setForm({ ...form, business_category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Grocery">Grocery</option>
                <option value="Snacks">Snacks</option>
                <option value="Bakery">Bakery</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                value={form.gstin}
                onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium uppercase outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* FSSAI License & Verification System */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={18} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upload Original FSSAI License Document *</h2>
            </div>
            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
              form.fssai_certificate_url ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              Status: {form.fssai_certificate_url ? 'Verified' : 'Not Uploaded'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">License Expiry Date (Optional)</label>
              <input
                type="date"
                value={form.fssai_expiry_date}
                onChange={e => setForm({ ...form, fssai_expiry_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Upload Original FSSAI Certificate Document (PDF / JPG / PNG - Max 50 KB) *</label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFssaiFileChange}
                  disabled={uploadingFssai}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/50 dark:file:text-emerald-300 hover:file:bg-emerald-100 disabled:opacity-50"
                />
                {uploadingFssai && (
                  <span className="text-xs font-bold text-emerald-600 animate-pulse flex items-center gap-1.5 shrink-0">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Uploading to Supabase Bucket...
                  </span>
                )}
                {form.fssai_certificate_url && !uploadingFssai && (
                  <button
                    type="button"
                    onClick={() => setShowFssaiModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye size={14} /> View FSSAI License Pic
                  </button>
                )}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                ⚡ Automatic Approval: Uploading your original FSSAI certificate automatically approves your FSSAI verification.
              </p>
              {fssaiUploadError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5">{fssaiUploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Addresses & Dispatch */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <MapPin className="text-emerald-600" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Addresses & Dispatch Locations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pickup Address *</label>
              <textarea
                required
                rows={2}
                value={form.pickup_address}
                onChange={e => setForm({ ...form, pickup_address: e.target.value })}
                placeholder="Full address where order courier pickup takes place"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Warehouse Address *</label>
              <textarea
                required
                rows={2}
                value={form.warehouse_address}
                onChange={e => setForm({ ...form, warehouse_address: e.target.value })}
                placeholder="Warehouse or stock storage address"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">State *</label>
              <input
                type="text"
                required
                value={form.state}
                onChange={e => setForm({ ...form, state: e.target.value })}
                placeholder="State"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">PIN Code *</label>
              <input
                type="text"
                required
                value={form.pincode}
                onChange={e => setForm({ ...form, pincode: e.target.value })}
                placeholder="6-digit PIN code"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Payment & Branding */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Phone className="text-emerald-600" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment & Merchant Branding</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">PhonePe Mobile Number *</label>
              <input
                type="tel"
                required
                value={form.phonepay_number}
                onChange={e => setForm({ ...form, phonepay_number: e.target.value })}
                placeholder="Registered PhonePe number for payouts"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Description *</label>
              <textarea
                required
                rows={2}
                value={form.business_description}
                onChange={e => setForm({ ...form, business_description: e.target.value })}
                placeholder="Short bio / description of your store & products"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Read-Only Account Metadata */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 text-xs flex flex-col sm:flex-row justify-between gap-4 text-slate-500 dark:text-slate-400">
          <div>
            <strong>Account Status:</strong> <span className="font-bold text-slate-800 dark:text-slate-200">{form.account_status}</span>
          </div>
          <div>
            <strong>Registration Date:</strong> {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
          </div>
          <div>
            <strong>Last Updated:</strong> {form.updated_at ? new Date(form.updated_at).toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving Merchant Settings..." : "Save Merchant Settings"}
          </button>
        </div>
      </form>

      {/* FSSAI License Document Modal Viewer */}
      {showFssaiModal && form.fssai_certificate_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={20} /> FSSAI License Certificate Document
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Uploaded to Supabase Bucket: {form.fssai_certificate_url.slice(0, 60)}...
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFssaiModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-center min-h-[400px]">
              {form.fssai_certificate_url.includes(".pdf") ? (
                <iframe
                  src={form.fssai_certificate_url}
                  className="w-full h-[550px] rounded-xl border-none"
                  title="FSSAI Document PDF"
                />
              ) : (
                <img
                  src={form.fssai_certificate_url}
                  alt="FSSAI License Certificate"
                  className="max-h-[600px] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <a
                href={form.fssai_certificate_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <FileText size={14} /> Open Direct File Link
              </a>
              <button
                type="button"
                onClick={() => setShowFssaiModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
