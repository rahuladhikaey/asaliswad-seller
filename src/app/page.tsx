"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl flex flex-col items-center">
        <div className="mb-6">
          <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold border border-slate-700 shadow-md">
            AS
          </div>
        </div>

        <div className="text-center mb-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Merchant Portal
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Seller Login
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage your pantry products, inventory & orders.
          </p>
        </div>

        <form className="w-full space-y-4" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs font-medium text-rose-300">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-xs font-medium text-amber-300">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-5 text-center w-full space-y-2">
          <p className="text-xs text-slate-400">
            New Merchant?{" "}
            <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
              Register New Seller Account
            </Link>
          </p>
          <div>
            <a
              href="https://www.asaliswad.com"
              className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
            >
              ← Return to Storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
          <span className="text-xs font-medium text-slate-400">Loading Portal...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
