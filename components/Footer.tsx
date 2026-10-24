import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const platforms = [
    { name: "YouTube", handle: "Long & Shorts", icon: "🔴" },
    { name: "TikTok", handle: "Viral FYP", icon: "🎵" },
    { name: "Instagram Reels", handle: "Explore Feed", icon: "📸" },
    { name: "X / Twitter", handle: "Timeline Video", icon: "𝕏" },
    { name: "Twitch", handle: "Stream Highlights", icon: "🟣" },
  ];

  return (
    <footer className="w-full flex flex-col items-center border-t border-white/[0.06] bg-[#050807] relative z-20">
      {/* Ecosystem strip */}
      <div className="w-full border-b border-white/[0.04] py-8 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#050807] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050807] to-transparent pointer-events-none z-10" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#4A5D54]">
              OPTIMIZED FOR SOCIAL RETENTION
            </span>
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              {platforms.map((p) => (
                <div key={p.name} className="flex items-center gap-2 group cursor-default">
                  <span className="text-sm">{p.icon}</span>
                  <span className="text-xs font-bold text-[#7A8E85] group-hover:text-white transition-colors">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Body */}
      <div className="w-full max-w-7xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-[8px] overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.jpeg"
                  alt="enclips logo"
                  width={28}
                  height={28}
                  className="object-contain w-full h-full rounded-[8px]"
                />
              </div>
              <span className="text-[18px] font-black tracking-tight text-white">enclips</span>
            </Link>
            <p className="text-sm text-[#7D8F86] max-w-sm leading-relaxed">
              Autonomous AI video intelligence engine. Converts long-form streams & podcasts into dozens of viral, engagement-optimized vertical clips in seconds.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/[0.06] border border-brand/15 text-[11px] font-mono text-brand">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span>All AI Systems Operational • Powered by Stellar</span>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-white">
              Platform
            </p>
            <ul className="space-y-2 text-sm text-[#7D8F86]">
              <li>
                <Link href="/clips" className="hover:text-brand transition-colors inline-flex items-center gap-1">
                  AI Clipper <ArrowUpRight className="w-3 h-3 text-[#4A5D54]" />
                </Link>
              </li>
              <li>
                <Link href="/ai-projects" className="hover:text-brand transition-colors inline-flex items-center gap-1">
                  Public Feed <ArrowUpRight className="w-3 h-3 text-[#4A5D54]" />
                </Link>
              </li>
              <li>
                <Link href="/agent-marketplace" className="hover:text-brand transition-colors inline-flex items-center gap-1">
                  Agent Marketplace <ArrowUpRight className="w-3 h-3 text-[#4A5D54]" />
                </Link>
              </li>
              <li>
                <Link href="/platforms" className="hover:text-brand transition-colors">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="space-y-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-white">
              Resources
            </p>
            <ul className="space-y-2 text-sm text-[#7D8F86]">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Documentation & Guide
                </Link>
              </li>
              <li>
                <a href="#privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <span className="text-[#4A5D54] cursor-not-allowed">
                  API Keys (Coming Soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5A6F65]">
          <p>© {currentYear} enclips AI. Built for the modern creator economy.</p>
          <div className="flex items-center gap-6">
            <span>Stellar On-Chain Verified</span>
            <span className="text-[#2A3B34]">•</span>
            <span>Zero Content Lock-in</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
