import React from "react";
import Image from "next/image";
import Link from "next/link";
import LandingLayout from "@/components/shared/LandingLayout";
import URLForm from "@/components/landing/URLForm";
import {
  Sparkles,
  Play,
  TrendingUp,
  Share2,
  Zap,
  Bot,
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  Video,
} from "lucide-react";

export default function Home() {
  return (
    <LandingLayout>
      <div className="w-full flex flex-col items-center gap-20 sm:gap-28 py-6 sm:py-12 animate-in fade-in duration-700">
        
        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center pt-2 sm:pt-6">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/[0.08] border border-brand/20 text-brand text-[11px] font-mono font-bold tracking-[0.15em] uppercase">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse shadow-[0_0_8px_#00E58F]" />
              AI CLIPPING ENGINE V2.0 • LIVE
            </div>

            {/* Main Headline */}
            <h1 className="text-[38px] sm:text-[54px] lg:text-[64px] font-black leading-[1.05] tracking-tight text-white">
              Turn 1 long video into <br className="hidden sm:inline" />
              <span className="text-gradient-brand">100+ viral clips</span> <br className="hidden sm:inline" />
              in seconds.
            </h1>

            {/* Subtitle */}
            <p className="text-[#8E9F97] text-base sm:text-lg max-w-[540px] mx-auto lg:mx-0 leading-[1.65] font-normal">
              Autonomous AI scans speech cadence, audience retention spikes, and facial reactions — delivering pre-framed 9:16 shorts with animated karaoke subtitles ready to post.
            </p>

            {/* Ingestion URL Form */}
            <div className="w-full max-w-[540px] mx-auto lg:mx-0 pt-1">
              <URLForm />
              <div className="flex items-center justify-center lg:justify-start gap-4 text-[11px] text-[#5A6F65] font-mono uppercase tracking-wider pt-3">
                <span>Supports:</span>
                <span className="text-[#8E9F97] font-semibold">YouTube</span>
                <span>•</span>
                <span className="text-[#8E9F97] font-semibold">TikTok</span>
                <span>•</span>
                <span className="text-[#8E9F97] font-semibold">Vimeo</span>
                <span>•</span>
                <span className="text-[#8E9F97] font-semibold">Local MP4</span>
              </div>
            </div>

            {/* Creator Social Proof Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#8E9F97] pt-2">
              <div className="flex -space-x-2.5">
                <div className="w-9 h-9 rounded-full border-2 border-[#060908] bg-zinc-800 relative overflow-hidden ring-1 ring-white/10">
                  <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="creator" fill sizes="36px" className="object-cover" />
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-[#060908] bg-zinc-700 relative overflow-hidden ring-1 ring-white/10">
                  <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" alt="creator" fill sizes="36px" className="object-cover" />
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-[#060908] bg-zinc-600 relative overflow-hidden ring-1 ring-white/10">
                  <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn" alt="creator" fill sizes="36px" className="object-cover" />
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-[#060908] bg-zinc-500 relative overflow-hidden ring-1 ring-white/10">
                  <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus" alt="creator" fill sizes="36px" className="object-cover" />
                </div>
              </div>
              <div className="text-left font-medium">
                <p className="text-white font-bold text-sm">10,000+ creators scaling shorts</p>
                <p className="text-[#5A6F65] text-xs">Over 12,000,000+ viral views generated</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 9:16 AI Clip Preview Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[360px] sm:max-w-[380px] rounded-[32px] p-4 bg-[#0A100D]/90 border border-white/10 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] glow-border animate-float">
              
              {/* Top Card Bar */}
              <div className="flex items-center justify-between pb-3 px-2 border-b border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span className="font-mono font-bold text-white tracking-wide">VIRAL HOOK DETECTED</span>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-brand/15 border border-brand/30 text-brand font-mono font-black text-[11px]">
                  98/100 SCORE
                </div>
              </div>

              {/* 9:16 Mockup Viewport */}
              <div className="relative aspect-[9/14] w-full rounded-[24px] overflow-hidden bg-gradient-to-b from-[#14201A] to-[#0A100D] border border-white/5 my-3 flex flex-col justify-between p-4">
                
                {/* Background ambient visual */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,229,143,0.18),transparent_60%)] pointer-events-none" />
                
                {/* Top overlay pills */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-white flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-brand" />
                    <span>0:32 Viral Peak</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
                    9:16 VERTICAL
                  </div>
                </div>

                {/* Simulated center visualizer */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-4">
                  <div className="w-14 h-14 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand shadow-[0_0_20px_rgba(0,229,143,0.3)]">
                    <Play className="w-6 h-6 fill-brand translate-x-0.5" />
                  </div>
                  
                  {/* Equalizer Waveform bars */}
                  <div className="flex items-center gap-1 h-8">
                    {[40, 70, 95, 60, 85, 100, 75, 90, 45, 65, 80, 50, 90, 30].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-brand/80 rounded-full transition-all duration-300"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Simulated Dynamic Karaoke Subtitles */}
                <div className="relative z-10 space-y-3 bg-black/70 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <p className="text-center font-black text-sm tracking-tight leading-snug">
                    <span className="text-white">“Wait for the </span>
                    <span className="text-brand bg-brand/20 px-1.5 py-0.5 rounded-md border border-brand/30">
                      PLOT TWIST
                    </span>
                    <span className="text-white"> at the end!” 🔥</span>
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-[#8E9F97]">
                    <span className="font-mono">Speech Cadence: High</span>
                    <span className="text-brand font-bold font-mono">Retention: 94.2%</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Distribution Bar */}
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <span className="text-[11px] font-mono text-[#5A6F65] uppercase">One-Click Post:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white">
                    TikTok
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white">
                    Reels
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white">
                    Shorts
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── Bento Feature Highlights ──────────────────────────────────── */}
        <section className="w-full space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#8E9F97] text-xs font-mono uppercase tracking-widest">
              Engine Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Engineered for the Modern Algorithm
            </h2>
            <p className="text-[#7D8F86] text-sm sm:text-base leading-relaxed">
              Every clip is optimized specifically to trigger watch-time loops on TikTok, Instagram Reels, and YouTube Shorts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1 */}
            <div className="bg-[#0B100E] border border-white/8 rounded-3xl p-7 space-y-4 relative overflow-hidden group hover:border-brand/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                AI Hook & Energy Detection
              </h3>
              <p className="text-sm text-[#7D8F86] leading-relaxed">
                Our Whisper AI engine transcribes every second, isolating punchlines, revelations, and debate spikes with 99.4% precision.
              </p>
              <div className="pt-2 font-mono text-xs text-brand flex items-center gap-1.5 font-bold">
                <span>Calibrated on 500k+ viral videos</span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="bg-[#0B100E] border border-white/8 rounded-3xl p-7 space-y-4 relative overflow-hidden group hover:border-brand/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Kinetic Karaoke Captions
              </h3>
              <p className="text-sm text-[#7D8F86] leading-relaxed">
                Dynamic, word-by-word highlighted captions with custom emojis that keep viewers hooked even with their sound off.
              </p>
              <div className="pt-2 font-mono text-xs text-brand flex items-center gap-1.5 font-bold">
                <span>Up to 3.8x higher silent watch-time</span>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="bg-[#0B100E] border border-white/8 rounded-3xl p-7 space-y-4 relative overflow-hidden group hover:border-brand/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Autonomous Agents & Stellar Pay
              </h3>
              <p className="text-sm text-[#7D8F86] leading-relaxed">
                Deploy specialized AI clipping agents for $0.50 USDC per job or receive instant tips directly on the Stellar blockchain network.
              </p>
              <div className="pt-2 font-mono text-xs text-brand flex items-center gap-1.5 font-bold">
                <span>Sub-second settlement • Low fees</span>
              </div>
            </div>

          </div>
        </section>

        {/* ─── 3-Step Pipeline Section ───────────────────────────────────── */}
        <section className="w-full bg-[#080D0B] border border-white/5 rounded-3xl p-8 sm:p-14 space-y-10 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <span className="text-xs font-mono font-bold text-brand uppercase tracking-widest">
                Seamless Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                How It Works in 3 Steps
              </h2>
            </div>
            <Link
              href="/signup"
              className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore the full guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="text-3xl font-black font-mono text-brand/40">01</div>
              <h4 className="text-lg font-bold text-white">Paste URL or Drop Video</h4>
              <p className="text-xs text-[#7D8F86] leading-relaxed">
                Directly paste any YouTube, TikTok, or Vimeo link, or upload raw MP4/MOV files up to 500MB into our processing cloud.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-3xl font-black font-mono text-brand/40">02</div>
              <h4 className="text-lg font-bold text-white">AI Extracts Retention Hooks</h4>
              <p className="text-xs text-[#7D8F86] leading-relaxed">
                Whisper AI generates a synchronized transcript, scans for narrative virality, auto-reframes to 9:16 and applies karaoke captions.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-3xl font-black font-mono text-brand/40">03</div>
              <h4 className="text-lg font-bold text-white">Preview, Post & Monetize</h4>
              <p className="text-xs text-[#7D8F86] leading-relaxed">
                Scrub through ranked clips with viral scores (0–100), download 1080p outputs, or syndicate directly to social channels.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA Banner ─────────────────────────────────────────── */}
        <section className="w-full bg-gradient-to-r from-[#0C1511] via-[#101D16] to-[#0C1511] border border-brand/20 rounded-[32px] p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,229,143,0.08)]">
          <div className="absolute -top-20 right-1/4 w-72 h-72 bg-brand/15 rounded-full blur-[90px] pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Ready to 10x your short-form growth?
          </h2>
          <p className="text-[#8E9F97] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Stop spending hours manually scrubbing footage. Let enclips find your best moments while you focus on creating.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full bg-brand hover:bg-brand-hover text-black font-black text-[15px] transition-all shadow-[0_0_25px_rgba(0,229,143,0.3)] hover:shadow-[0_0_35px_rgba(0,229,143,0.5)] transform hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold text-[14px] transition-all"
            >
              Read Documentation
            </Link>
          </div>
        </section>

      </div>
    </LandingLayout>
  );
}
