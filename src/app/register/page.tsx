"use client";

import { useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CheckCircle2, Building2, MapPin, KeyRound, ArrowRight, Tag, CreditCard } from "lucide-react";

export default function SellerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "address" | "otp" | "submitted">("info");

  // Merchant Details
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [category, setCategory] = useState("Grocery");
  const [password, setPassword] = useState("");

  // Location & Address
  const [pickupLocation, setPickupLocation] = useState("");
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

  const parseErrorMsg = (err: any): string => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.message && typeof err.message === "string") return err.message;
    return "Registration encountered an issue. Please verify your details.";
  };

  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const targetEmail = email.trim() || `${mobileNumber}@seller.asaliswad.com`;
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send OTP.");
        setLoading(false);
        return;
      }
      setInfoMessage(`Verification OTP sent to ${targetEmail}`);
      setStep("otp");
    } catch (err: any) {
      setError(parseErrorMsg(err) || "Failed to send OTP.");
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === "otp") {
      setLoading(true);
      const targetEmail = email.trim() || `${mobileNumber}@seller.asaliswad.com`;
      try {
        const verifyRes = await fetch("/api/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", email: targetEmail, otp: otpInput }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          setError(verifyData.error || "Invalid OTP entered. Please try again.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError("Failed to verify OTP. Please try again.");
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      let userId: string | undefined = undefined;

      try {
        const targetEmail = email.trim() || `${mobileNumber}@seller.asaliswad.com`;
        const signupRes = await fetch("/api/auth/signup-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetEmail,
            password: password,
            fullName: fullName.trim(),
            phone: mobileNumber.trim(),
          }),
        });
        const signupData = await signupRes.json();
        if (signupRes.ok && signupData.success) {
          userId = signupData.user?.id;
        } else {
          // Fallback to sign in if account already exists
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: password,
          });
          userId = signInData?.user?.id;
        }
      } catch (authCatchErr) {
        console.warn("Auth signup exception handled:", authCatchErr);
      }

      const generatedSellerCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
      const sellerRecord = {
        id: userId || `seller-${Date.now()}`,
        user_id: userId || `seller-${Date.now()}`,
        seller_id: generatedSellerCode,
        full_name: fullName.trim(),
        owner_name: fullName.trim(),
        business_name: `${fullName.trim()} Store`,
        mobile_number: mobileNumber.trim(),
        phone_number: mobileNumber.trim(),
        email: email.trim() || `${mobileNumber}@seller.asaliswad.com`,
        upi_id: upiId.trim() || null,
        phonepay_no: upiId.trim() || null,
        pickup_location: pickupLocation.trim(),
        pickup_address: pickupLocation.trim(),
        warehouse_address: pickupLocation.trim(),
        city: city.trim() || pickupLocation.trim(),
        state: state.trim() || "Default State",
        pincode: pincode.trim() || "000000",
        category: category,
        status: "approved",
        account_status: "Active",
        delete_requested: false,
        created_at: new Date().toISOString(),
      };

      const { error: sellerError } = await supabase.from("sellers").insert([sellerRecord]);
      if (sellerError) {
        console.warn("Seller profile creation notice:", sellerError);
      }

      // Persist pickup location
      try {
        await supabase.from("seller_pickup_locations").insert([{
          seller_id: sellerRecord.id,
          name: `${fullName} Main Warehouse`,
          location_name: pickupLocation,
          phone: mobileNumber,
          email: email,
          address_line1: pickupLocation,
          city: city || pickupLocation,
          state: state || "Default State",
          pincode: pincode || "000000",
          is_default: true,
        }]);
      } catch (locErr) {
        console.warn("Pickup location insert notice:", locErr);
      }

      setStep("submitted");
    } catch (err: any) {
      console.error("Registration submit error:", err);
      setError(parseErrorMsg(err));
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
              Merchant Registration
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
                {step === "info" && "Seller Account Details"}
                {step === "address" && "Pickup & Merchant Category"}
                {step === "otp" && "Phone OTP Verification"}
              </h1>
              <p className="text-xs font-bold text-text-secondary mt-1">
                {step === "info" && "Enter your full name, contact, UPI ID, and password."}
                {step === "address" && "Select your category (Grocery/Snacks/Bakery) and pickup address."}
                {step === "otp" && `Enter 6-digit OTP code sent to +91 ${mobileNumber}`}
              </p>
            </div>
          )}

          {error && error.trim() !== "" && (
            <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100/50">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* STEP 1: MERCHANT INFO */}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                    Phone Number (OTP Verified) *
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
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="seller@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  UPI ID (For Weekly Payouts) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="name@upi / 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Password *
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
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl hover:opacity-90 active:scale-95"
              >
                <span>Continue to Category & Address</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: CATEGORY & LOCATION */}
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
                  Merchant Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3.5 text-sm font-bold outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Bakery">Bakery</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Pickup Location / Warehouse Address *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Street name, landmark, area for courier pickup"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 text-sm font-bold outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">State</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">Pincode</label>
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="h-14 px-6 rounded-2xl border-2 border-slate-200/50 font-bold text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Sending OTP..." : "Send OTP & Register"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION */}
          {step === "otp" && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {infoMessage && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {infoMessage}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  6-Digit Phone OTP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full text-center tracking-[0.5em] rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 px-5 py-4 text-xl font-black outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep("address")}
                  className="h-14 px-6 rounded-2xl border-2 border-slate-200/50 font-bold text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify OTP & Open Dashboard"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "submitted" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Seller Account Active & Approved!
              </h2>
              <p className="text-sm font-bold text-text-secondary max-w-md mx-auto leading-relaxed">
                Welcome to Asali Swad! Your merchant account is fully registered under category <span className="text-emerald-600 font-black">{category}</span>.
              </p>
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center px-8 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90"
                >
                  Go to Seller Dashboard
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-foreground/[0.06] pt-6 text-center">
            <p className="text-xs font-bold text-text-secondary">
              Already registered?{" "}
              <Link href="/" className="text-primary font-black hover:underline">
                Sign In to Seller Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
