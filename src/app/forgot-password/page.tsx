"use client";

import { useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
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

      <div className="w-full max-w-md">
        <div className="rounded-[3rem] bg-foreground/[0.05] p-8 md:p-12 backdrop-blur-xl border border-foreground/[0.08] shadow-2xl flex flex-col">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight">Forgot Password</h1>
            <p className="text-xs font-bold text-text-secondary mt-1">
              Enter your seller account email to receive reset instructions.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100/50 dark:border-rose-900/30">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-snug">
                {error}
              </p>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-black">Reset Email Sent</h2>
              <p className="text-xs font-bold text-text-secondary">
                We've sent a password reset link to <span className="text-primary">{email}</span>. Please check your inbox.
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  Registered Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seller@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:opacity-[0.85] active:scale-95 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
