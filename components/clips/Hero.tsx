"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <div className="text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-6 duration-700 ease-out max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/[0.08] border border-brand/20 text-brand text-[11px] font-mono font-bold tracking-[0.16em] uppercase">
        <Sparkles className="w-3.5 h-3.5 fill-brand" />
        AI VIRAL WORKSTATION V2.0
      </div>

      <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-black tracking-tight text-white leading-[1.08]">
        Turn Long Videos into{" "}
        <span className="text-gradient-brand">Viral Shorts</span>
      </h1>

      <p className="text-[#8E9F97] text-[15px] sm:text-[18px] max-w-2xl mx-auto font-normal leading-relaxed">
        High-retention moment extraction for TikTok, Reels, and YouTube Shorts. Paste a URL or drop your footage below to let the AI cut your clips.
      </p>
    </div>
  );
}
