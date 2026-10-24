import React from "react";
import AuthForm from "@/components/AuthForm";
import LandingLayout from "@/components/shared/LandingLayout";
import { Sparkles, CheckCircle2, TrendingUp, Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <LandingLayout>
      <div className="w-full flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-16 animate-in fade-in duration-700 py-6">
        {/* Left column: Returning creator showcase */}
        <div className="flex-1 space-y-8 max-w-[540px] text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/[0.08] border border-brand/20 text-brand text-[11px] font-mono font-bold tracking-[0.15em] uppercase">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            CREATOR STUDIO ACCESS
          </div>

          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-black leading-[1.08] tracking-tight text-white">
            Welcome back to your <br className="hidden sm:inline" />
            <span className="text-gradient-brand">AI Video Studio</span>
          </h1>

          <p className="text-[#8E9F97] text-base sm:text-lg leading-[1.65]">
            Sign in to access your processed clips, track viral engagement metrics, and deploy autonomous editing agents.
          </p>

          {/* Value points */}
          <div className="space-y-3.5 pt-2 text-left max-w-md mx-auto lg:mx-0">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant Hook Extraction</p>
                <p className="text-[11px] text-[#5A6F65]">Resume editing where you left off</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Multi-Platform Publishing</p>
                <p className="text-[11px] text-[#5A6F65]">Auto-sync to TikTok, Reels, and Shorts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: AuthForm */}
        <div className="w-full max-w-[440px] flex justify-center lg:justify-end">
          <AuthForm mode="login" />
        </div>
      </div>
    </LandingLayout>
  );
}
