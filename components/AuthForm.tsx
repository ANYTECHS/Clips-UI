"use client";

import React, { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { z } from "zod";
import apiClient from "@/lib/apiClient";
import WalletButton from "@/components/shared/WalletButton";
import { signAuthMessage, ensureHexSignature } from "@/lib/wallet";
import EmailVerificationModal from "@/components/auth/EmailVerificationModal";

// ─── Validation ───────────────────────────────────────────────────────────────

const emailAuthSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});



// ─── Component ────────────────────────────────────────────────────────────────

interface AuthFormProps {
  mode?: "login" | "signup";
  showWallet?: boolean;
}

export default function AuthForm({ mode = "login", showWallet = true }: AuthFormProps) {
  const { setUser } = useAuth();
  const router = useRouter();

  const currentMode = mode;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const shakeCard = () => {
    const card = document.getElementById("auth-card");
    if (card) {
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
    }
  };

  // ── wallet connect handler ─────────────────────────────────────────────────

  /**
   * Fired by WalletButton the moment the user approves their wallet.
   *
   * Authenticates the user using the new challenge/signin/signup endpoints.
   * No email or password required.
   */
  const handleWalletConnect = async (address: string) => {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      // 1. Get challenge from backend
      // Response: { challenge, message, expiresIn }
      // We'll sign the 'challenge' string (the unique ID) and send it back as 'message'.
      setInfo("Generating challenge...");
      const challengeRes = await apiClient.post("/auths/wallet/challenge", {
        stellarAddress: address,
      });
      const { challenge } = challengeRes.data;

      if (!challenge) {
        throw new Error("Failed to get a valid challenge from the server.");
      }

      // 2. Sign the challenge with the wallet
      setInfo("Please sign the challenge in your wallet...");
      const rawSignature = await signAuthMessage(challenge);
      const signature = ensureHexSignature(rawSignature);

      // 3. Attempt signin first; if no account exists, auto-signup instead.
      setInfo("Authenticating...");
      try {
        const signinRes = await apiClient.post("/auths/wallet/signin", {
          stellarAddress: address,
          signature,
          message: challenge,
        });
        setUser(signinRes.data.user);
        router.push(signinRes.data.redirect ?? "/dashboard");
      } catch (signinErr: any) {
        if (signinErr.response?.status === 401 && signinErr.response?.data?.message?.includes("No account found")) {
          // No account found — create one
          setInfo("Creating your account...");
          const signupRes = await apiClient.post("/auths/wallet/signup", {
            stellarAddress: address,
            signature,
            message: challenge,
          });
          setUser(signupRes.data.user);
          router.push(signupRes.data.redirect ?? "/dashboard");
        } else {
          throw signinErr;
        }
      }
    } catch (err: any) {
      console.error("Wallet auth error:", err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      let message = backendMessage || err.message || "Wallet authentication failed";
      if (Array.isArray(message)) message = message[0];
      // 409 means the wallet is registered but signin somehow failed — tell the user
      if (err.response?.status === 409) {
        message = "This wallet is already registered. Try signing in instead.";
      }
      setError(message);
      setInfo("");
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  // ── email / password submit ────────────────────────────────────────────────

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    try {
      if (currentMode === "signup" && !cleanFullName) {
        throw new Error("Full name is required");
      }

      const validationResult = emailAuthSchema.safeParse({
        email: cleanEmail,
        password,
        fullName: currentMode === "signup" ? cleanFullName : undefined,
      });

      if (!validationResult.success) {
        throw new Error(validationResult.error.issues[0].message);
      }

      if (currentMode === "login") {
        await apiClient.post("/auths/login", { email: cleanEmail, password });
        const { data: user } = await apiClient.get("/users/me");
        setUser(user);
        router.push("/dashboard");
      } else {
        // Step 1: Send OTP to email before creating account
        await apiClient.post("/auths/send-otp", { email: cleanEmail });
        setPendingVerificationEmail(cleanEmail);
        setShowVerificationModal(true);
        setInfo("Verification code sent! Please check your email.");
      }
    } catch (err: any) {
      const status = err.response?.status;
      let message = err.response?.data?.message || err.message || "An error occurred";
      if (Array.isArray(message)) message = message[0];

      if (status === 400 && currentMode === "login") {
        console.error("Auth validation error:", err.response?.data);
      }

      // If user attempted login but email is not verified yet, show inline message with action link
      if (currentMode === "login" && typeof message === "string" && message.toLowerCase().includes("verify your email")) {
        setPendingVerificationEmail(cleanEmail);
        setIsUnverified(true);
        setError("Please verify your email before logging in.");
        shakeCard();
        return;
      }

      // Handle 409 Conflict or 400 Bad Request (email already registered)
      const isAlreadyExists =
        status === 409 ||
        (status === 400 &&
          typeof message === "string" &&
          (message.toLowerCase().includes("already exist") ||
            message.toLowerCase().includes("already registered") ||
            message.toLowerCase().includes("already in use")));

      if (isAlreadyExists) {
        if (currentMode === "signup") {
          message = "This email is already registered. Try logging in instead.";
        } else {
          message = "This email is already registered. Try logging in instead.";
        }
      }

      setError(message);
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      id="auth-card"
      className="w-full max-w-[440px] mx-auto bg-[#0C120F]/90 backdrop-blur-2xl rounded-[28px] p-6 sm:p-9 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden glow-border"
    >
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand/10 rounded-full blur-[70px] pointer-events-none" />

      <h2 className="text-[24px] sm:text-[28px] text-white font-black tracking-tight mb-1">
        {currentMode === "login" ? "Welcome back" : "Create an account"}
      </h2>
      <p className="text-[#8E9F97] mb-6 sm:mb-8 text-[13px] sm:text-[14px]">
        {currentMode === "login"
          ? "Log in to access your video projects & AI clips"
          : "Sign up in seconds to start clipping viral moments"}
      </p>

      {showWallet && (
        <>
          <div className="mb-6 sm:mb-7">
            <WalletButton
              onConnect={handleWalletConnect}
              className="w-full flex items-center justify-center gap-3 bg-brand/[0.08] hover:bg-brand/15 border border-brand/25 text-brand py-3.5 rounded-xl font-bold transition-all text-[13.5px] shadow-[0_0_15px_rgba(0,229,143,0.1)] hover:shadow-[0_0_25px_rgba(0,229,143,0.2)]"
            />
          </div>

          <div className="flex items-center gap-4 text-[#4A5D54] text-[10px] font-mono font-bold tracking-[0.15em] uppercase mb-6 sm:mb-7">
            <div className="flex-1 h-px bg-white/10" />
            OR CONTINUE WITH EMAIL
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {currentMode === "signup" && (
          <div>
            <label className="block text-[12px] font-bold text-[#8E9F97] uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full bg-[#080D0B] border border-white/10 text-white focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:bg-[#0E1512] transition-all placeholder-[#4A5D54]"
            />
          </div>
        )}
        <div>
          <label className="block text-[12px] font-bold text-[#8E9F97] uppercase tracking-wider mb-2">
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setIsUnverified(false);
            }}
            placeholder="name@company.com"
            className="w-full bg-[#080D0B] border border-white/10 text-white focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:bg-[#0E1512] transition-all placeholder-[#4A5D54]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#8E9F97] uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
                setIsUnverified(false);
              }}
              placeholder="••••••••"
              className="w-full bg-[#080D0B] border border-white/10 text-white focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-xl pl-4 pr-11 py-3.5 text-[14px] focus:outline-none focus:bg-[#0E1512] transition-all placeholder-[#4A5D54]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7D8F86] hover:text-white transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="space-y-2 pt-1 text-center">
            <div className="text-[12.5px] text-red-400 font-medium">
              {error}
            </div>
            {isUnverified && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const targetEmail = pendingVerificationEmail || email.trim().toLowerCase();
                    setPendingVerificationEmail(targetEmail);
                    setShowVerificationModal(true);
                  }}
                  className="text-[12px] text-brand hover:underline font-bold inline-flex items-center gap-1.5 bg-brand/10 hover:bg-brand/15 px-3.5 py-1.5 rounded-lg border border-brand/20 transition-all"
                >
                  <span>Enter verification code or resend OTP</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        )}

        {info && (
          <div className="text-[12.5px] text-center pt-1 text-brand font-medium">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-hover text-black py-4 rounded-xl font-black text-[14.5px] flex justify-center items-center gap-2 transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(0,229,143,0.25)] hover:shadow-[0_0_30px_rgba(0,229,143,0.4)] active:scale-[0.98] mt-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-black" />
          ) : currentMode === "login" ? (
            "Continue with Email"
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="text-center mt-6 text-[13px] text-[#7D8F86]">
        {currentMode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="text-brand font-bold hover:underline cursor-pointer"
            >
              Sign up free
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-brand font-bold hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {currentMode === "signup" && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              const targetEmail = pendingVerificationEmail || email.trim().toLowerCase();
              setPendingVerificationEmail(targetEmail);
              setShowVerificationModal(true);
            }}
            className="text-[12px] text-[#5A6F65] hover:text-brand transition-colors underline"
          >
            Already have a verification code? Verify now
          </button>
        </div>
      )}

      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={pendingVerificationEmail}
        signupPayload={
          currentMode === "signup" && fullName && password
            ? { fullName: fullName.trim(), password }
            : undefined
        }
        onChangeEmail={() => {
          setShowVerificationModal(false);
          const emailInput = document.getElementById("auth-email");
          if (emailInput) {
            emailInput.focus();
          }
        }}
        onVerified={() => {
          setShowVerificationModal(false);
          router.push("/onboarding");
        }}
      />
    </div>
  );
}
