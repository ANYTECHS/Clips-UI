"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  ArrowRight,
  ClipboardPaste,
  Edit3,
  Check,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified?: () => void;
  onChangeEmail?: () => void;
}

export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  onVerified,
  onChangeEmail,
}: EmailVerificationModalProps) {
  const { setUser } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [inputEmail, setInputEmail] = useState(email || "");
  const [verifying, setVerifying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [copiedPasted, setCopiedPasted] = useState(false);

  useEffect(() => {
    if (email) setInputEmail(email);
  }, [email]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clean state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setResendStatus("");
      setVerifiedSuccess(false);
      setToken("");
    }
  }, [isOpen, email]);

  // Helper to complete verification
  const handleVerificationSuccess = useCallback(async () => {
    setVerifiedSuccess(true);
    setError("");
    try {
      const { data: user } = await apiClient.get("/users/me");
      setUser(user, true);
      setTimeout(() => {
        if (onVerified) {
          onVerified();
        } else {
          router.push("/onboarding");
        }
        onClose();
      }, 1500);
    } catch {
      // If /users/me fails for any reason, still redirect to onboarding
      setTimeout(() => {
        if (onVerified) {
          onVerified();
        } else {
          router.push("/onboarding");
        }
        onClose();
      }, 1500);
    }
  }, [onClose, onVerified, router, setUser]);

  // Background polling to detect if user clicked the link in their email in another tab
  useEffect(() => {
    if (!isOpen || verifiedSuccess) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get("/users/me", { _sessionCheck: true } as any);
        if (res.data && res.data.id) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          handleVerificationSuccess();
        }
      } catch {
        // Expected until user verifies
      }
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, verifiedSuccess, handleVerificationSuccess]);

  // Verify using token or code
  const handleVerifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let cleanToken = token.trim();
    if (!cleanToken) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }

    // Smart handling: if the user pastes an entire link, extract the otp or token query param
    if (cleanToken.includes("otp=")) {
      const match = cleanToken.match(/[?&]otp=([^&]+)/);
      if (match && match[1]) {
        cleanToken = decodeURIComponent(match[1]);
      }
    } else if (cleanToken.includes("token=")) {
      const match = cleanToken.match(/[?&]token=([^&]+)/) || cleanToken.match(/token=([^&]+)/);
      if (match && match[1]) {
        cleanToken = decodeURIComponent(match[1]);
      }
    }

    const targetEmail = (inputEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setError("Please provide your email address.");
      return;
    }

    setError("");
    setResendStatus("");
    setVerifying(true);

    try {
      // Backend expects POST /auths/verify-email with { email, otp }
      await apiClient.post("/auths/verify-email", {
        email: targetEmail,
        otp: cleanToken,
      });
      await handleVerificationSuccess();
    } catch (err: any) {
      console.error("Token verification error:", err);
      const backendMessage = err.response?.data?.message || err.message;
      let msg = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage;
      if (!msg || msg === "An error occurred") {
        msg = "Invalid or expired verification code. Please check your code or request a new one.";
      }
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  // Check verification status button (in case they clicked link in mail tab)
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setError("");
    try {
      const res = await apiClient.get("/users/me", { _sessionCheck: true } as any);
      if (res.data && res.data.id) {
        await handleVerificationSuccess();
      } else {
        setError("Your account is not verified yet. Please enter your verification code below.");
      }
    } catch {
      setError("Your account is not verified yet. Please enter your verification code below.");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Resend verification email
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setResendStatus("");

    const target = (inputEmail || email).trim().toLowerCase();
    if (!target) {
      setError("Please enter your email address to resend the code.");
      return;
    }

    try {
      await apiClient.post("/auths/resend-verification", { email: target });
      setResendStatus("A new verification email has been sent! Check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || err.message;
      const msg = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage;
      if (err.response?.status === 400 && msg?.toLowerCase().includes("already verified")) {
        setResendStatus("This email is already verified! You can proceed to log in.");
        setTimeout(() => {
          router.push("/login");
          onClose();
        }, 1500);
      } else {
        setError(msg || "Could not resend verification email. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  // Clipboard paste helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setToken(text.trim());
        setCopiedPasted(true);
        setTimeout(() => setCopiedPasted(false), 2000);
      }
    } catch {
      // Browser permission denied or unsupported
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[460px] bg-[#0E1512] border border-[#1E2A24] rounded-[24px] p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand/15 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-brand/10 rounded-full blur-[70px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8e9895] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {verifiedSuccess ? (
          /* Success Screen */
          <div className="flex flex-col items-center text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Email Verified!
              </h3>
              <p className="text-[#8e9895] text-[14px]">
                Your account is ready. Redirecting you to onboarding...
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-brand text-[13px] font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Setting up your workspace...</span>
            </div>
          </div>
        ) : (
          /* Main Verification Form */
          <div className="space-y-5">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand shadow-[0_0_25px_rgba(0,229,143,0.15)] relative">
                <Mail className="w-7 h-7" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand border-2 border-[#0E1512]" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand">
                  Verification Required
                </span>
                <h3 className="text-[24px] font-bold text-white tracking-tight">
                  Verify your email
                </h3>
                <p className="text-[#8e9895] text-[13.5px] leading-relaxed max-w-[360px]">
                  We sent a verification link and code to:
                </p>
              </div>

              {/* Email Pill Badge or Input */}
              {email ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131A17] border border-[#1E2A24] text-white text-[13px] font-medium">
                  <span className="text-brand max-w-[240px] truncate">{email}</span>
                  {onChangeEmail && (
                    <button
                      onClick={() => {
                        onClose();
                        onChangeEmail();
                      }}
                      type="button"
                      title="Change email"
                      className="text-[#8e9895] hover:text-white transition-colors ml-1 p-0.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-[320px]">
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-[#131A17] border border-[#1E2A24] text-white focus:border-brand/70 rounded-[12px] px-3.5 py-2 text-[13px] focus:outline-none placeholder-[#4A5D54] text-center"
                  />
                </div>
              )}
            </div>

            {/* Error or Resend Status Banners */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}

            {resendStatus && (
              <div className="p-3 rounded-xl bg-brand/10 border border-brand/25 text-brand text-[13px] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{resendStatus}</span>
              </div>
            )}

            {/* Direct Token/Code Input */}
            <form onSubmit={handleVerifyToken} className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12.5px] font-medium text-[#8e9895]">
                    6-Digit Verification Code (OTP)
                  </label>
                  {typeof navigator !== "undefined" && navigator.clipboard && (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="text-[12px] text-brand hover:underline flex items-center gap-1 font-medium"
                    >
                      {copiedPasted ? (
                        <>
                          <Check className="w-3 h-3 text-brand" />
                          <span>Pasted!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardPaste className="w-3 h-3" />
                          <span>Paste code</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setError("");
                    }}
                    placeholder="205283"
                    className="w-full bg-[#131A17] border border-[#1E2A24] text-white focus:border-brand/70 rounded-[12px] px-4 py-3.5 text-[20px] text-center focus:outline-none focus:bg-[#161F1A] transition-all font-mono tracking-[0.25em] placeholder:text-[#3A4A43] placeholder:tracking-normal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifying || !token.trim()}
                className="w-full bg-brand hover:bg-brand-hover text-black py-3 rounded-[12px] font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,229,143,0.2)]"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Secondary actions: I clicked the link & Resend */}
            <div className="space-y-3 pt-2 border-t border-[#1E2A24]">
              {/* Check if verified in other tab */}
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="w-full py-2.5 px-4 rounded-[12px] bg-white/5 hover:bg-white/10 text-white font-medium text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {checkingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-brand" />
                )}
                <span>I clicked the link in my email</span>
              </button>

              {/* Resend button */}
              <div className="flex items-center justify-between text-[13px] px-1">
                <span className="text-[#84908C]">Didn&apos;t receive it?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="text-brand hover:underline font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline transition-opacity"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Helpful tip */}
            <p className="text-[11.5px] text-[#5A6F65] text-center leading-normal pt-1">
              Check your spam or promotions folder if you don&apos;t see the email within 2 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
