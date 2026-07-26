"use client";

import { useState, useMemo } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CheckCircle2, Store, User, Mail, Phone, Lock, Tag, Layers, ArrowRight, ShieldCheck } from "lucide-react";

const CATEGORY_MAP: Record<string, string[]> = {
  Grocery: ["Rice & Pulses", "Atta & Flour", "Spices & Seasoning", "Oils & Ghee", "Organic Specials"],
  Snacks: ["Dry Fruits & Nuts", "Namkeen & Savories", "Biscuits & Cookies", "Mithai & Sweets", "Roasted Snacks"],
  Bakery: ["Fresh Breads", "Rusk & Toast", "Cakes & Pastries", "Buns & Rolls"],
  Beverages: ["Tea & Coffee", "Juices & Drinks", "Health Mixes"],
  Spices: ["Whole Spices", "Powdered Spices", "Blended Masalas"]
};

export default function SellerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "otp" | "submitted">("info");

  // Required Fields
  const [sellerName, setSellerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("Grocery");
  const [subcategory, setSubcategory] = useState("Rice & Pulses");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP Verification
  const [otpInput, setOtpInput] = useState("");

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Available Subcategories based on selected Category
  const subcategoryOptions = useMemo(() => {
    return CATEGORY_MAP[category] || CATEGORY_MAP["Grocery"];
  }, [category]);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "bg-slate-300 dark:bg-slate-700" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 33, label: "Weak", color: "bg-rose-500" };
    if (score <= 4) return { score: 66, label: "Medium", color: "bg-amber-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  const parseErrorMsg = (err: any): string => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.message && typeof err.message === "string") return err.message;
    return "Registration encountered an issue. Please verify your details.";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sellerName.trim() || !shopName.trim() || !mobileNumber.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send OTP to email.");
        setLoading(false);
        return;
      }
      setInfoMessage(`Verification OTP code sent to ${normalizedEmail}! Please check your email inbox.`);
      setStep("otp");
    } catch (err: any) {
      setError(parseErrorMsg(err) || "Failed to send OTP.");
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpInput.trim()) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify OTP Code
    try {
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: otpInput.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || "Invalid OTP code. Please check your email and try again.");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError("Failed to verify OTP. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Register Merchant Credentials & Create Seller Record
    try {
      let userId: string | undefined = undefined;

      try {
        const signupRes = await fetch("/api/auth/signup-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: password,
            fullName: sellerName.trim(),
            phone: mobileNumber.trim(),
          }),
        });
        const signupData = await signupRes.json();
        if (signupRes.ok && signupData.success && signupData.user?.id) {
          userId = signupData.user.id;
        } else {
          // Client-side fallback to supabase.auth.signUp
          const { data: clientSignUpData } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
            options: {
              data: {
                full_name: sellerName.trim(),
                role: "seller",
                phone: mobileNumber.trim(),
              },
            },
          });
          if (clientSignUpData?.user?.id) {
            userId = clientSignUpData.user.id;
          } else {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: password,
            });
            userId = signInData?.user?.id;
          }
        }
      } catch (authCatchErr) {
        console.warn("Auth signup notice:", authCatchErr);
      }

      const isValidUuid = (val: any) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const validUserId = isValidUuid(userId) ? userId : null;

      if (!validUserId) {
        setError("Could not verify your authentication account with Supabase Auth. Please try again.");
        setLoading(false);
        return;
      }

      const generatedSellerCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;

      const sellerPayload: any = {
        id: validUserId,
        user_id: validUserId,
        seller_id: generatedSellerCode,
        full_name: sellerName.trim(),
        owner_name: sellerName.trim(),
        business_name: shopName.trim(),
        mobile_number: mobileNumber.trim(),
        phone_number: mobileNumber.trim(),
        email: normalizedEmail,
        category: category,
        business_category: `${category} - ${subcategory}`,
        status: "approved",
        account_status: "Active",
        email_verified: true,
        delete_requested: false,
        created_at: new Date().toISOString(),
      };

      // Check if seller already exists by email
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingSeller) {
        // Update existing seller row
        await supabase
          .from("sellers")
          .update(sellerPayload)
          .eq("email", normalizedEmail);
      } else {
        // Insert new seller row
        const { error: sellerError } = await supabase
          .from("sellers")
          .insert([sellerPayload]);

        if (sellerError && sellerPayload.id) {
          // If insert with primary key id failed, retry without id column but keep user_id
          delete sellerPayload.id;
          await supabase.from("sellers").insert([sellerPayload]);
        }
      }

      setStep("submitted");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(parseErrorMsg(err));
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 text-foreground overflow-hidden bg-slate-950">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[120px] -z-10" />

      <div className="absolute top-8 right-8">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-xl">
        <div className="rounded-[2.5rem] bg-slate-900/80 p-8 md:p-12 backdrop-blur-xl border border-slate-800 shadow-2xl flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
              AsaliSwad Merchant Portal
            </span>
            <div className="flex gap-2">
              <span className={`h-2 w-8 rounded-full transition-all ${step === "info" ? "bg-emerald-500" : "bg-slate-800"}`} />
              <span className={`h-2 w-8 rounded-full transition-all ${step === "otp" ? "bg-emerald-500" : "bg-slate-800"}`} />
            </div>
          </div>

          {step !== "submitted" && (
            <div className="mb-6">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {step === "info" && "Seller Account Registration"}
                {step === "otp" && "Email OTP Verification"}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {step === "info" && "Register your merchant details & pantry product category."}
                {step === "otp" && `Enter 6-digit verification code sent to ${email}`}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-950/40 p-4 border border-rose-800/50">
              <p className="text-xs font-bold text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* STEP 1: REGISTRATION FORM */}
          {step === "info" && (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              {/* Seller Name */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-emerald-400" />
                  <span>Seller Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Shop Name */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Store size={14} className="text-emerald-400" />
                  <span>Shop Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asali Swad Spices & Pantry"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Subcategory Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Tag size={14} className="text-emerald-400" />
                    <span>Sell by Category *</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setSubcategory(CATEGORY_MAP[newCat]?.[0] || "");
                    }}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Snacks">Snacks & Sweets</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Spices">Spices & Masalas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-400" />
                    <span>Subcategory *</span>
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {subcategoryOptions.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-400" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Mail size={14} className="text-emerald-400" />
                    <span>Email (Verified) *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seller@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Strong Password Input */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock size={14} className="text-emerald-400" />
                    <span>Strong Password *</span>
                  </span>
                  {password && (
                    <span className={`text-[10px] font-bold uppercase ${passwordStrength.label === "Strong" ? "text-emerald-400" : passwordStrength.label === "Medium" ? "text-amber-400" : "text-rose-400"}`}>
                      {passwordStrength.label} Password
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters (Letters, Numbers, Symbols)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
                {password && (
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-wider text-white shadow-xl hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>{loading ? "Sending OTP..." : "Send Verification OTP & Continue"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form className="space-y-5" onSubmit={handleRegisterSubmit}>
              {infoMessage && (
                <div className="rounded-2xl bg-emerald-950/40 p-4 border border-emerald-800/50">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>{infoMessage}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 block text-center">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="------"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full text-center tracking-[0.6em] rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-2xl font-black text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="h-14 px-6 rounded-2xl border border-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-emerald-600 text-xs font-black uppercase tracking-wider text-white shadow-xl hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP & Complete Registration"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "submitted" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={42} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Seller Account Active & Approved!
              </h2>
              <p className="text-xs font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
                Welcome to Asali Swad! <span className="text-white font-bold">{shopName}</span> is registered under category <span className="text-emerald-400 font-black">{category} ({subcategory})</span>.
              </p>
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center px-8 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:bg-emerald-500 transition-all"
                >
                  Go to Seller Dashboard
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
            <p className="text-xs font-bold text-slate-400">
              Already registered?{" "}
              <Link href="/" className="text-emerald-400 font-black hover:underline">
                Sign In to Seller Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
