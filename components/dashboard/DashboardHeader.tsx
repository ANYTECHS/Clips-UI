"use client";

import React from "react";
import Link from "next/link";
import { Bell, Menu, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import WalletButton from "@/components/shared/WalletButton";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const firstName = user?.username || user?.profile?.username || user?.fullName?.split(" ")[0] || "Creator";

  return (
    <header className="w-full border-b border-white/[0.05] bg-[#060908]/70 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center py-4 sm:py-5 px-4 sm:px-6 lg:px-10 gap-3 sm:gap-6">
        {/* Left: Mobile hamburger menu & Greeting */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-[#8E9F97] hover:text-white transition-colors shrink-0 rounded-xl bg-white/[0.03] border border-white/5"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse hidden sm:inline-block shadow-[0_0_8px_#00E58F]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-brand/90 hidden sm:inline-block">
                STUDIO DASHBOARD
              </span>
            </div>
            <h1 className="text-[18px] xs:text-[22px] sm:text-[26px] lg:text-[28px] font-black tracking-tight text-white leading-tight truncate">
              Welcome back, {firstName}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <WalletButton
            responsiveCompact
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#0E1512] border border-white/10 text-[#8E9F97] hover:text-white hover:border-white/20 transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shrink-0 shadow-sm"
          />
          
          <button
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0E1512] border border-white/10 flex items-center justify-center text-[#8E9F97] hover:text-white transition-colors relative shrink-0 hover:border-white/20 shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand rounded-full ring-2 ring-[#0E1512]" />
          </button>

          <Link
            href="/clips"
            className="h-10 sm:h-11 bg-brand hover:bg-brand-hover text-black px-4 sm:px-5 rounded-xl font-black text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(0,229,143,0.25)] hover:shadow-[0_0_30px_rgba(0,229,143,0.4)] transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>New Clip</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
