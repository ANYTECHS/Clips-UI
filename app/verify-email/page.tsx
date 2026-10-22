"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight, RefreshCw } from "lucide-react";
import LandingLayout from "@/components/shared/LandingLayout";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuth();

  const tokenParam = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(tokenParam);
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "idle">(
    tokenParam ? "verifying" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const verifyToken = useCallback(async (tok: string) => {
    const clean = tok.trim();
    if (!clean) {
      setStatus("error");
      setErrorMessage("No verification token was provided.");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    try {
      await apiClient.get(`/auths/verify-email?token=${encodeURIComponent(clean)}`);
      
      // Fetch user profile and update auth state
      try {
        const { data: user } = await apiClient.get("/users/me");
        setUser(user, true);
      } catch {
        // If profile fetch fails, still consider verification valid
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/onboarding");
      }, 2000);
    } catch (err: any) {
      console.error("Verification failed:", err);
      const backendMessage = err.response?.data?.message || err.message;
      const msg = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage;
      setStatus("error");
      setErrorMessage(msg || "Invalid or expired verification token. Please request a new one.");
    }
  }, [router, setUser]);

  useEffect(() => {
    if (tokenParam) {
      verifyToken(tokenParam);
    }
  }, [tokenParam, verifyToken]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      verifyToken(tokenInput.trim());
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resendEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setResending(true);
    setResendSuccess("");
    setErrorMessage("");

    try {
      await apiClient.post("/auths/resend-verification", { email: cleanEmail });
      setResendSuccess("A new verification email has been sent to your inbox!");
      setResendCooldown(60);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || err.message;
      const msg = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage;
      setErrorMessage(msg || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto bg-[#0E1512]/90 backdrop-blur-md rounded-[24px] p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-[#1E2A24] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand/10 rounded-full blur-[60px] pointer-events-none" />

      {status === "verifying" && (
        <div className="flex flex-col items-center text-center space-y-5 py-4">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Verifying your email</h2>
            <p className="text-[#8e9895] text-[14px]">
              Please wait while we verify your account credentials...
            </p>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand shadow-[0_0_30px_rgba(0,229,143,0.25)]">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Email Verified!</h2>
            <p className="text-[#8e9895] text-[14px]">
              Your account has been successfully verified. Welcome to enclips!
            </p>
          </div>
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full bg-brand hover:bg-brand-hover text-black py-3.5 rounded-[12px] font-bold text-[14px] flex items-center justify-center gap-2 transition-all mt-4"
          >
            <span>Continue to Onboarding</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Verification Failed</h2>
              <p className="text-red-400 text-[13.5px] leading-relaxed">
                {errorMessage || "The verification link is invalid or has expired."}
              </p>
            </div>
          </div>

          {/* Try with another token */}
          <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
            <label className="block text-[12.5px] font-medium text-[#8e9895]">
              Have a code or token? Enter it below:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste verification token"
                className="flex-1 bg-[#131A17] border border-[#1E2A24] text-white rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-brand/70 font-mono"
              />
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="bg-brand hover:bg-brand-hover text-black px-4 py-2.5 rounded-[12px] font-bold text-[13px] disabled:opacity-50 transition-colors"
              >
                Verify
              </button>
            </div>
          </form>

          {/* Resend section */}
          <div className="p-4 rounded-[16px] bg-[#131A17] border border-[#1E2A24] space-y-3">
            <div className="flex items-center gap-2 text-white text-[13px] font-semibold">
              <Mail className="w-4 h-4 text-brand" />
              <span>Need a new verification link?</span>
            </div>

            {resendSuccess && (
              <div className="text-[12.5px] text-brand">
                {resendSuccess}
              </div>
            )}

            <form onSubmit={handleResend} className="flex gap-2">
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 bg-[#0E1512] border border-[#1E2A24] text-white rounded-[10px] px-3 py-2 text-[13px] focus:outline-none focus:border-brand/70"
              />
              <button
                type="submit"
                disabled={resending || resendCooldown > 0 || !resendEmail.trim()}
                className="bg-white/10 hover:bg-white/15 text-white px-3.5 py-2 rounded-[10px] font-medium text-[12.5px] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {resending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : resendCooldown > 0 ? (
                  <span>{resendCooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center pt-2">
            <Link href="/login" className="text-brand hover:underline text-[13px] font-medium">
              Return to Login
            </Link>
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Email Verification</h2>
              <p className="text-[#8e9895] text-[13.5px]">
                Paste the verification code or token sent to your email to verify your account.
              </p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <input
              type="text"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste verification token here"
              className="w-full bg-[#131A17] border border-[#1E2A24] text-white rounded-[12px] px-4 py-3 text-[14px] focus:outline-none focus:border-brand/70 font-mono"
            />
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="w-full bg-brand hover:bg-brand-hover text-black py-3 rounded-[12px] font-bold text-[14px] disabled:opacity-50 transition-colors"
            >
              Verify Code
            </button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-brand hover:underline text-[13px] font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <LandingLayout>
      <div className="w-full flex justify-center items-center py-12 px-4">
        <Suspense
          fallback={
            <div className="w-full max-w-[480px] bg-[#0E1512] rounded-[24px] p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </LandingLayout>
  );
}
