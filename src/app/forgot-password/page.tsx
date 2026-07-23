"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send reset OTP. Please check your email.");
        setLoading(false);
        return;
      }

      setStep("verify");
      setSuccessMsg("✅ Verification OTP sent to your email! Please enter it below along with your new password.");
    } catch (err: any) {
      setError("Failed to connect to OTP service. Please try again.");
    }
    setLoading(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Verify OTP code
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: email.trim(), otp: otpCode }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || "Invalid or expired OTP code.");
        setLoading(false);
        return;
      }

      // 2. Reset password via admin API (auto-confirms user)
      const resetRes = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });
      const resetData = await resetRes.json();

      if (!resetRes.ok || !resetData.success) {
        setError(resetData.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccessMsg("✅ Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch (err: any) {
      setError("An unexpected error occurred during password reset.");
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
            <h1 className="text-2xl font-black tracking-tight">
              {step === "request" ? "Forgot Password" : "Reset Password via OTP"}
            </h1>
            <p className="text-xs font-bold text-text-secondary mt-1">
              {step === "request"
                ? "Enter your seller account email to receive a 6-digit OTP code."
                : "Enter the 6-digit OTP code sent to your email along with your new password."}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 border border-rose-100/50 dark:border-rose-900/30">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-snug">
                {error}
              </p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100/50 dark:border-emerald-900/30">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-snug">
                {successMsg}
              </p>
            </div>
          )}

          {step === "request" ? (
            <form className="space-y-4" onSubmit={handleSendOtp}>
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
                {loading ? "Sending OTP..." : "Send OTP Verification Code ✨"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetSubmit}>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  6-Digit Verification OTP *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.4em] rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-base font-black outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-text-muted mb-1 block">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200/50 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6 || !newPassword}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:opacity-[0.85] active:scale-95 disabled:opacity-50"
              >
                {loading ? "Updating Password..." : "Verify OTP & Update Password ✨"}
              </button>

              <button
                type="button"
                onClick={() => setStep("request")}
                disabled={loading}
                className="w-full text-center text-xs font-bold text-text-muted hover:text-primary transition-colors pt-2"
              >
                Change Email / Resend Code
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
