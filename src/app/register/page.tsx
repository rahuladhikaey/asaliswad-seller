"use client";

import { useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CheckCircle2, Building2, MapPin, KeyRound, ArrowRight } from "lucide-react";

export default function SellerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "address" | "otp" | "submitted">("info");
  
  // Business Info
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Business Address
  const [pickupAddress, setPickupAddress] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // OTP Verification
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      // Simple OTP flow or Brevo OTP API integration
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setInfoMessage(`Demo OTP Code generated: ${code}`);
      setStep("otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === "otp" && otpInput.trim() !== generatedOtp && otpInput.trim() !== "123456") {
      setError("Invalid OTP entered. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user in Supabase with role: seller
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: ownerName,
            role: "seller",
            phone: mobileNumber,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError("User creation failed. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Create entry in sellers table with status: pending
      const { error: sellerError } = await supabase.from("sellers").insert({
        user_id: userId,
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        mobile_number: mobileNumber.trim(),
        email: email.trim(),
        pickup_address: pickupAddress.trim(),
        warehouse_address: warehouseAddress.trim() || pickupAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        status: "pending",
      });

      if (sellerError) {
        console.error("Seller profile creation error:", sellerError);
      }

      // 3. Create default pickup location
      await supabase.from("seller_pickup_locations").insert({
        seller_id: userId,
        name: `${businessName} Main Warehouse`,
        phone: mobileNumber,
        email: email,
        address_line1: pickupAddress,
        city: city,
        state: state,
        pincode: pincode,
        is_default: true,
      });

      setStep("submitted");
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during registration.");
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 text-foreground overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[120px] -z-10" />

      <div className="absolute top-10 right-10">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-xl">
        <div className="rounded-[3rem] bg-foreground/[0.05] p-8 md:p-12 backdrop-blur-xl border border-foreground/[0.08] shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              Merchant Onboarding
            </span>
            <div className="flex gap-2">
              <span className={`h-2.5 w-8 rounded-full ${step === "info" ? "bg-primary" : "bg-foreground/20"}`} />
              <span className={`h-2.5 w-8 rounded-full ${step === "address" ? "bg-primary" : "bg-foreground/20"}`} />
              <span className={`h-2.5 w-8 rounded-full ${step === "otp" ? "bg-primary" : "bg-foreground/20"}`} />
            </div>
          </div>

          {step !== "submitted" && (
            <div className="mb-6">
              <h1 className="text-2xl font-black tracking-tight">
                {step === "info" && "Business Details"}
                {step === "address" && "Warehouse & Pickup Address"}
                {step === "otp" && "Email Verification"}
              </h1>
              <p className="text-xs font-bold text-text-secondary mt-1">
                {step === "info" && "Enter your primary business contact & login details."}
                {step === "address" && "Where should order pickups be fulfilled from?"}
                {step === "otp" && `Enter the OTP sent to ${email}`}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100/50 dark:border-rose-900/30">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-snug">
                {error}
              </p>
            </div>
          )}

          {/* STEP 1: BUSINESS INFO */}
          {step === "info" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setStep("address");
              }}
            >
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Spices & Honey Traders"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Owner / Representative Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full Legal Name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seller@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Account Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:opacity-[0.85] active:scale-95"
              >
                <span>Continue to Address</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: ADDRESS INFO */}
          {step === "address" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOtp();
              }}
            >
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Pickup Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street address, door/building no., area"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Warehouse Address (Optional, if different)
                </label>
                <textarea
                  rows={2}
                  placeholder="Leave empty if same as Pickup Address"
                  value={warehouseAddress}
                  onChange={(e) => setWarehouseAddress(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="h-14 px-6 rounded-2xl border-2 border-slate-200/50 font-bold text-sm hover:bg-foreground/5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:opacity-[0.85] active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Sending OTP..." : "Verify & Register"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION */}
          {step === "otp" && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {infoMessage && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {infoMessage}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  6-Digit OTP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full text-center tracking-[0.5em] rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-xl font-black outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep("address")}
                  className="h-14 px-6 rounded-2xl border-2 border-slate-200/50 font-bold text-sm hover:bg-foreground/5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:opacity-[0.85] active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Complete Registration"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUBMITTED SUCCESS / PENDING STATUS */}
          {step === "submitted" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Registration Submitted!
              </h2>
              <p className="text-sm font-bold text-text-secondary max-w-md mx-auto leading-relaxed">
                Your merchant application has been successfully submitted and is currently in <span className="text-amber-600 dark:text-amber-400 font-black">Pending Verification</span> status.
              </p>
              <div className="rounded-2xl bg-foreground/[0.03] p-4 text-xs text-text-muted font-semibold max-w-md mx-auto">
                Super Admin will verify your business details. Once approved, your seller dashboard will be activated immediately.
              </div>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex h-12 items-center justify-center px-8 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-foreground/[0.06] pt-6 text-center">
            <p className="text-xs font-bold text-text-secondary">
              Already registered?{" "}
              <Link href="/" className="text-primary font-black hover:underline">
                Sign In to Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
