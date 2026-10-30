"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  TrendingUp,
  Smartphone,
  Info,
  FileVideo,
} from "lucide-react";
import { triggerDownload } from "@/lib/download";
import {
  ReadyToPostKit,
  getClipReadyToPostKit,
} from "@/lib/queries";

export interface ReadyToPostClip {
  id: string;
  title: string;
  thumbnail?: string | null;
  clipUrl?: string | null;
  duration?: string;
  caption?: string;
  hashtags?: string[];
  platform?: string;
  readyToPostKit?: ReadyToPostKit | null;
}

interface ReadyToPostModalProps {
  clip: ReadyToPostClip;
  onClose: () => void;
}

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800";

// Resolve and sanitize platform URLs to prevent mobile app intent errors on desktop
function resolvePlatformUrl(platform: "tiktok" | "shorts" | "reels" | "x", rawUrl?: string): string {
  if (platform === "tiktok") {
    // If url is missing, or contains mobile app intent/AppsFlyer redirect, use direct web uploader
    if (!rawUrl || rawUrl.startsWith("intent:") || rawUrl.includes("af_deeplink") || rawUrl.includes("creator-center")) {
      return "https://www.tiktok.com/upload";
    }
    return rawUrl;
  }
  if (platform === "shorts") {
    // If url contains placeholder channel "UC", use canonical universal upload redirect
    if (!rawUrl || rawUrl.includes("/channel/UC/") || rawUrl.includes("/channel/UC")) {
      return "https://www.youtube.com/upload";
    }
    return rawUrl;
  }
  if (platform === "reels") {
    return rawUrl || "https://www.instagram.com/";
  }
  if (platform === "x") {
    return rawUrl || "https://x.com/compose/post";
  }
  return rawUrl || "#";
}

export default function ReadyToPostModal({ clip, onClose }: ReadyToPostModalProps) {
  const [kit, setKit] = useState<ReadyToPostKit | null>(clip.readyToPostKit || null);
  const [_loadingKit, setLoadingKit] = useState(!clip.readyToPostKit);

  // Generate fallback high-retention default caption if kit doesn't provide one
  const fallbackCaption =
    clip.caption ||
    `${clip.title}\n\nWatch till the end for the best takeaway! 👀 What's your take on this?\n\n#viral #shorts #trending #contentcreator #reels #tiktok`;

  const [caption, setCaption] = useState(
    clip.readyToPostKit?.copyTemplates?.readyToPost || fallbackCaption
  );
  const [userEdited, setUserEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Fetch readyToPostKit directly if not passed in props
  useEffect(() => {
    if (clip.readyToPostKit) {
      setKit(clip.readyToPostKit);
      if (clip.readyToPostKit.copyTemplates?.readyToPost && !userEdited) {
        setCaption(clip.readyToPostKit.copyTemplates.readyToPost);
      }
      setLoadingKit(false);
      return;
    }

    let active = true;
    setLoadingKit(true);
    getClipReadyToPostKit(clip.id)
      .then((data) => {
        if (!active) return;
        if (data) {
          setKit(data);
          if (data.copyTemplates?.readyToPost && !userEdited) {
            setCaption(data.copyTemplates.readyToPost);
          }
        }
      })
      .catch((err) => {
        console.warn("[ReadyToPostModal] Failed to load readyToPostKit directly:", err);
      })
      .finally(() => {
        if (active) setLoadingKit(false);
      });

    return () => {
      active = false;
    };
  }, [clip.id, clip.readyToPostKit, userEdited]);

  // Priority download URL: kit.downloadUrl > clip.clipUrl
  const effectiveDownloadUrl = kit?.downloadUrl || clip.clipUrl || "";

  const handleCopyCaption = async (textToCopy?: string) => {
    const targetText = textToCopy ?? caption;
    try {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = targetText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!effectiveDownloadUrl) return;
    setDownloading(true);
    triggerDownload(effectiveDownloadUrl, clip.title || "viral_clip");
    setTimeout(() => setDownloading(false), 1500);
  };

  // Quick action platform links using clip.readyToPostKit.platformLinks
  const platformLinks = [
    {
      name: "TikTok",
      url: resolvePlatformUrl("tiktok", kit?.platformLinks?.tiktok),
      icon: "🎵",
      color: "hover:border-[#ff0050]/50 hover:bg-[#ff0050]/10",
      desc: "Web Studio Uploader",
    },
    {
      name: "YouTube Shorts",
      url: resolvePlatformUrl("shorts", kit?.platformLinks?.shorts || kit?.platformLinks?.youtube),
      icon: "▶️",
      color: "hover:border-[#FF0000]/50 hover:bg-[#FF0000]/10",
      desc: "Creator Studio Upload",
    },
    {
      name: "Instagram Reels",
      url: resolvePlatformUrl("reels", kit?.platformLinks?.reels || kit?.platformLinks?.instagram),
      icon: "📸",
      color: "hover:border-[#E1306C]/50 hover:bg-[#E1306C]/10",
      desc: "Web Uploader & Reels",
    },
    {
      name: "X / Twitter",
      url: resolvePlatformUrl("x", kit?.platformLinks?.twitter || kit?.platformLinks?.x),
      icon: "𝕏",
      color: "hover:border-white/40 hover:bg-white/10",
      desc: "Compose New Post",
    },
  ];

  // QR Code URL for phone scanning
  const qrTargetUrl = effectiveDownloadUrl || (typeof window !== "undefined" ? window.location.href : "");
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&color=00e58f&bgcolor=080C0B&data=${encodeURIComponent(
    qrTargetUrl
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[680px] bg-[#0A0F0D] border border-brand/25 rounded-[28px] overflow-hidden shadow-[0_10px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(0,229,143,0.1)] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" />

        {/* Modal Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[20px] font-black text-white tracking-tight">
                  Ready-to-Post Kit
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-brand/15 border border-brand/30 text-brand text-[10px] font-black uppercase tracking-wider">
                  3-Click Publish
                </span>
                {kit && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#5A6F65] text-[10px] font-bold">
                    HD Kit Linked
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#5A6F65] font-medium">
                Download HD, copy AI caption, and open TikTok, Shorts, & Reels with 100% organic reach
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#5A6F65] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Clip summary card */}
          <div className="bg-[#111A15]/80 border border-white/[0.05] rounded-2xl p-3.5 flex items-center gap-4">
            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
              <Image
                src={clip.thumbnail || FALLBACK_THUMB}
                alt={clip.title}
                fill
                className="object-cover"
              />
              {clip.duration && (
                <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] font-bold text-white">
                  {clip.duration}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-bold text-white truncate mb-1">
                {clip.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-[#5A6F65]">
                <span className="text-brand font-semibold flex items-center gap-1">
                  <FileVideo className="w-3 h-3 inline" /> 9:16 Vertical HD
                </span>
                <span>•</span>
                <span>Algorithm Optimized</span>
              </div>
            </div>

            <button
              onClick={() => setShowQr(!showQr)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                showQr
                  ? "bg-brand/15 border-brand text-brand"
                  : "bg-white/[0.03] border-white/10 text-[#5A6F65] hover:text-white"
              }`}
              title="Scan with phone"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send to Phone</span>
            </button>
          </div>

          {/* QR Code Phone Handoff Dropdown */}
          {showQr && (
            <div className="bg-[#0D1511] border border-brand/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 animate-in slide-in-from-top-2 duration-300">
              <div className="w-32 h-32 rounded-xl bg-[#080C0B] border border-brand/20 p-2 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeImageUrl}
                  alt="QR Code to Download on Phone"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-brand text-[13px] font-bold">
                  <QrCode className="w-4 h-4" />
                  <span>Scan to Download Directly to Mobile</span>
                </div>
                <p className="text-[12px] text-[#8e9895] leading-relaxed">
                  Open your phone&apos;s camera and scan the QR code. You can save the video directly to
                  your camera roll to add trending TikTok sounds, stickers, and hashtags natively!
                </p>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Step 1: [ ⬇️ Download HD Clip ]                            */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A6F65] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">
                  1
                </span>
                Download High-Definition Clip
              </span>
              <span className="text-[11px] text-[#5A6F65]">MP4 • 1080×1920 (HD)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={!effectiveDownloadUrl || downloading}
                className="flex-1 py-4 px-6 rounded-2xl bg-brand hover:bg-brand-hover text-black font-extrabold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-[0_0_30px_rgba(0,229,143,0.25)] hover:shadow-[0_0_45px_rgba(0,229,143,0.4)] active:scale-[0.99] disabled:opacity-50"
              >
                <Download className={`w-5 h-5 ${downloading ? "animate-bounce" : ""}`} />
                {downloading ? "Starting HD Download…" : "⬇️ Download HD Clip"}
              </button>

              {effectiveDownloadUrl && (
                <a
                  href={effectiveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-4 rounded-2xl bg-[#111A15] border border-white/10 hover:border-brand/40 text-[#5A6F65] hover:text-white transition-all flex items-center justify-center"
                  title="Open video link in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Step 2: [ 📋 Copy Caption & Hashtags ]                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A6F65] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">
                  2
                </span>
                AI Caption & Curated Hashtags
              </span>
              <button
                onClick={() => handleCopyCaption()}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "📋 Copy"}
              </button>
            </div>

            <div className="relative">
              <textarea
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  setUserEdited(true);
                }}
                rows={3}
                className="w-full bg-[#111A15] border border-white/10 focus:border-brand/50 text-white rounded-2xl p-4 text-[13px] leading-relaxed focus:outline-none resize-none font-sans transition-colors"
                placeholder="Writing caption & hashtags..."
              />
              <button
                onClick={() => handleCopyCaption()}
                className={`absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all ${
                  copied
                    ? "bg-brand text-black"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    📋 Copy Caption & Hashtags
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Step 3: Quick action links for TikTok, Shorts, and Reels   */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5A6F65] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">
                  3
                </span>
                Quick Action Links (Launch & Upload)
              </span>
              <span className="text-[11px] text-[#5A6F65] flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-brand" />
                100% Native Algorithm Reach
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platformLinks.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3.5 rounded-2xl bg-[#111A15] border border-white/[0.06] flex flex-col items-center justify-center text-center gap-1.5 transition-all group ${p.color}`}
                >
                  <span className="text-[20px]">{p.icon}</span>
                  <div className="flex items-center gap-1 text-[13px] font-bold text-white group-hover:text-brand">
                    <span>{p.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-[#5A6F65] leading-tight">
                    {p.desc}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Strategy Tip Banner */}
          <div className="p-3.5 rounded-xl bg-brand/[0.04] border border-brand/15 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#8e9895] leading-relaxed">
              <strong className="text-white">Why Ready-to-Post Kit?</strong> Uploading manually through these
              official links allows you to use trending audio & native stickers, which gives{" "}
              <strong className="text-brand">3x to 5x higher reach</strong> than bot automated posting!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
