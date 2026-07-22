"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("Access Denied. Your account does not have seller privileges.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      const role = user?.user_metadata?.role || "customer";

      if (role !== "seller" && role !== "admin") {
        setError("Access Denied. This panel is reserved for registered sellers.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check seller profile status from DB
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sellerData) {
        if (sellerData.status === "pending") {
          setStatusMessage("⏳ Your seller account registration is currently pending Super Admin verification. You will be notified once approved.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (sellerData.status === "rejected") {
          setError(`❌ Your seller registration was rejected. Reason: ${sellerData.rejection_reason || "Not specified"}`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (sellerData.status === "suspended") {
          setError("⛔ Your seller account has been suspended by Administration. Please contact support.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[3rem] bg-foreground/[0.05] p-8 md:p-12 backdrop-blur-xl border border-foreground/[0.08] shadow-2xl flex flex-col items-center">
        <div className="mb-6 transition-transform hover:scale-110 duration-500">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-black shadow-lg border-4 border-white dark:border-slate-800">
            AS
          </div>
        </div>

        <div className="text-center mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Merchant Portal
          </span>
          <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
            Seller Login
          </h1>
          <p className="mt-2 text-xs font-bold text-text-secondary">
            Manage your pantry products, inventory & orders.
          </p>
        </div>

        <form className="w-full space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="group relative">
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-text-muted focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-primary/5"
              />
            </div>
            <div className="group relative">
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-text-muted focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-primary/5"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100/50 dark:border-rose-900/30">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-snug">
                {error}
              </p>
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-100/50 dark:border-amber-900/30">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-snug">
                {statusMessage}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition-all duration-300 hover:opacity-[0.85] active:scale-95 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In ✨"}
          </button>
        </form>

        <div className="mt-8 border-t border-foreground/[0.06] pt-6 text-center w-full space-y-3">
          <p className="text-xs font-bold text-text-secondary">
            New Merchant?{" "}
            <Link href="/register" className="text-primary font-black hover:underline">
              Register New Seller Account
            </Link>
          </p>
          <div>
            <a
              href="https://www.asaliswad.com"
              className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted hover:text-primary transition-colors duration-300"
            >
              Return to Storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 text-foreground overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[120px] -z-10" />
      
      <div className="absolute top-10 right-10">
        <DarkModeToggle />
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          <span className="text-sm font-bold text-text-muted">Loading Portal...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
