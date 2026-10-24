"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { getEarningsData } from "@/lib/queries";

export default function EarningsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["earningsData"],
    queryFn: getEarningsData,
  });

  const totalXlm = data?.totalXlm || "0";
  const tipCount = data?.tipCount || 0;
  const recentTips = data?.recentTips || [];

  // Generate mock earnings data for the graph (7 days)
  const earningsGraphData = React.useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentTotal = parseFloat(totalXlm) || 12.5;
    return days.map((day, i) => {
      const progress = (i + 1) / days.length;
      const value = Math.max(0.5, currentTotal * Math.pow(progress, 1.2));
      return { day, value: value.toFixed(2) };
    });
  }, [totalXlm]);

  if (isLoading) {
    return (
      <div className="bg-[#0B100E] border border-white/8 rounded-[28px] p-8 flex items-center justify-center min-h-[180px]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const formatXlm = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const formatAddress = (address: string) => {
    if (!address) return "0x00…0000";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  };

  const formatDate = (date: string) => {
    if (!date) return "Recent";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-[#0B100E] border border-white/8 rounded-[28px] p-7 sm:p-8 hover:border-brand/25 transition-all shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Creator Earnings</h3>
            <p className="text-xs text-[#7D8F86] font-medium">Stellar On-Chain Micro-Tips & Bounties</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-mono font-bold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Active Monetization</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 relative z-10">
        <div className="bg-[#070B09] border border-white/5 rounded-2xl p-5">
          <p className="text-[#7D8F86] text-[11px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5">
            Total Revenue
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight tabular-nums">
              {formatXlm(totalXlm)}
            </span>
            <span className="text-sm font-bold text-brand font-mono">XLM</span>
          </div>
        </div>

        <div className="bg-[#070B09] border border-white/5 rounded-2xl p-5">
          <p className="text-[#7D8F86] text-[11px] font-mono font-bold uppercase tracking-[0.16em] mb-1.5">
            Supporter Tips
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight tabular-nums">
              {tipCount}
            </span>
            <span className="text-xs font-medium text-[#7D8F86]">transactions</span>
          </div>
        </div>
      </div>

      {/* Earnings Graph */}
      <div className="bg-[#070B09] border border-white/5 rounded-2xl p-5 mb-7 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#7D8F86] text-[11px] font-mono font-bold uppercase tracking-[0.16em]">
            Weekly Growth Trend
          </p>
          <span className="text-[10px] font-mono text-brand font-bold bg-brand/10 px-2 py-0.5 rounded-full">
            STELLAR MAINNET
          </span>
        </div>
        
        <div className="relative h-28 w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 280 96" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="280" y2="0" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="0" y1="48" x2="280" y2="48" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="0" y1="96" x2="280" y2="96" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Area fill */}
            <path
              d={`M0,96 L0,${96 - (parseFloat(earningsGraphData[0].value) / (parseFloat(totalXlm) || 12.5) * 75)} ${earningsGraphData
                .map((d, i) => {
                  const x = (i / (earningsGraphData.length - 1)) * 280;
                  const y = Math.max(10, 96 - (parseFloat(d.value) / (parseFloat(totalXlm) || 12.5) * 75));
                  return `L${x},${y}`;
                })
                .join(" ")} L280,96 Z`}
              fill="url(#gradient-earnings)"
              opacity="0.25"
            />

            {/* Line */}
            <path
              d={`M0,${96 - (parseFloat(earningsGraphData[0].value) / (parseFloat(totalXlm) || 12.5) * 75)} ${earningsGraphData
                .map((d, i) => {
                  const x = (i / (earningsGraphData.length - 1)) * 280;
                  const y = Math.max(10, 96 - (parseFloat(d.value) / (parseFloat(totalXlm) || 12.5) * 75));
                  return `L${x},${y}`;
                })
                .join(" ")}`}
              fill="none"
              stroke="#00E58F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <defs>
              <linearGradient id="gradient-earnings" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00E58F" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00E58F" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Day labels */}
          <div className="flex justify-between mt-3 px-1 text-[10px] font-mono font-medium text-[#5A6F65]">
            {earningsGraphData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tips List */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono font-bold text-[#7D8F86] uppercase tracking-wider">
            Recent On-Chain Activity
          </p>
          {recentTips.length > 0 && (
            <span className="text-xs font-mono text-brand font-bold">{recentTips.length} verified</span>
          )}
        </div>

        {recentTips.length === 0 ? (
          <div className="text-center py-6 border border-white/5 rounded-2xl bg-[#070B09]">
            <p className="text-sm font-semibold text-white">No tips received yet</p>
            <p className="text-xs text-[#5A6F65] mt-1">Share your clips on social platforms to start receiving micro-tips.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTips.slice(0, 3).map((tip: any) => (
              <div
                key={tip.id}
                className="flex items-center justify-between p-3.5 bg-[#070B09] border border-white/5 rounded-xl hover:border-brand/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-white">
                      {formatAddress(tip.senderAddress)}
                    </p>
                    <p className="text-[10px] text-[#5A6F65] font-mono">{formatDate(tip.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-black text-brand">+{formatXlm(tip.amount)} XLM</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
