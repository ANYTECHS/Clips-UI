"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  isPositive?: boolean;
  icon: LucideIcon;
}

export default function StatCard({ label, value, trend, isPositive = true, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-[#0B100E] border border-white/8 rounded-[28px] p-7 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-brand/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/[0.03] group-hover:bg-brand/[0.07] rounded-full blur-2xl pointer-events-none transition-colors" />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[#8E9F97] text-[11px] font-mono font-bold uppercase tracking-[0.16em]">
          {label}
        </span>
        <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/8 flex items-center justify-center text-[#7D8F86] group-hover:text-brand group-hover:bg-brand/10 group-hover:border-brand/20 transition-all">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4 relative z-10">
        <h3 className="text-[38px] font-black text-white leading-none font-mono tracking-tight tabular-nums">
          {value}
        </h3>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
            isPositive
              ? "bg-brand/10 border border-brand/25 text-brand"
              : "bg-rose-500/10 border border-rose-500/25 text-rose-400"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{trend}</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}
