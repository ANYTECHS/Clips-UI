"use client";

import React from "react";
import { Zap, ShieldCheck, Flame } from "lucide-react";

export default function ClipsStats() {
  const stats = [
    { label: "Clips Processed Today", value: "4,820+", detail: "High retention moments detected", icon: Flame },
    { label: "Viral Hook Accuracy", value: "99.4%", detail: "Calibrated on 500k+ viral videos", icon: ShieldCheck },
    { label: "Average Render Speed", value: "1.8s", detail: "Per minute of source audio", icon: Zap },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-[#0B100E] border border-white/8 hover:border-brand/30 rounded-[28px] p-6 text-center transition-all duration-300 group relative overflow-hidden shadow-lg hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.6)]"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-brand/[0.03] group-hover:bg-brand/[0.08] rounded-full blur-2xl transition-colors pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/8 flex items-center justify-center text-brand mb-1 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5" />
              </div>

              <p className="text-[32px] sm:text-[36px] font-black text-white font-mono tracking-tight tabular-nums group-hover:text-brand transition-colors">
                {stat.value}
              </p>

              <p className="text-[11px] font-mono font-bold text-[#8E9F97] uppercase tracking-[0.14em]">
                {stat.label}
              </p>

              <div className="pt-2 border-t border-white/5 w-full mt-2">
                <p className="text-[11px] font-medium text-[#5A6F65]">{stat.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
