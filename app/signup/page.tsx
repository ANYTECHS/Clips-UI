import React from "react";
import AuthForm from "@/components/AuthForm";
import LandingLayout from "@/components/shared/LandingLayout";
import { Sparkles, CheckCircle2, ShieldCheck, Flame } from "lucide-react";

export default function SignupPage() {
  return (
    <LandingLayout>
      <div className="w-full flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-16 animate-in fade-in duration-700 py-6">
        {/* Left column: Value proposition */}
        <div className="flex-1 space-y-8 max-w-[540px] text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/[0.08] border border-brand/20 text-brand text-[11px] font-mono font-bold tracking-[0.15em] uppercase">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            JOIN 10,000+ TOP CREATORS
          </div>

          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-black leading-[1.08] tracking-tight text-white">
            Scale your short-form reach with <br className="hidden sm:inline" />
            <span className="text-gradient-brand">Autonomous AI</span>
          </h1>

          <p className="text-[#8E9F97] text-base sm:text-lg leading-[1.65]">
            Create your account in 30 seconds. Get instant access to viral hook detection, auto 9:16 reframing, and animated karaoke captions.
          </p>

          {/* Checklist */}
          <div className="space-y-3 pt-2 text-left max-w-md mx-auto lg:mx-0">
            {[
              "Drop any YouTube, TikTok or Vimeo link for 1-click processing",
              "Automatic 9:16 vertical re-framing with smart subject tracking",
              "Dynamic animated captions proven to 3x silent viewer retention",
              "Optional Stellar Web3 wallet micro-tipping & AI agent hiring",
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#A1B3AA]">{item}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-brand/[0.04] border border-brand/15 text-xs text-brand/90 font-medium max-w-md mx-auto lg:mx-0">
            ⚡ <strong>Pro Tip:</strong> No credit card required. Connect via email or your Stellar wallet in 1 click.
          </div>
        </div>

        {/* Right column: AuthForm */}
        <div className="w-full max-w-[440px] flex justify-center lg:justify-end">
          <AuthForm mode="signup" showWallet={true} />
        </div>
      </div>
    </LandingLayout>
  );
}
