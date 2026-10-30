"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, X, Volume2, VolumeX, Download, Lock, Unlock, Sparkles, Loader2 } from "lucide-react";
import TipModal from "./TipModal";
import { useWallet } from "@/components/WalletProvider";
import { isUnlocked } from "@/lib/tipUnlockStore";
import { getClipDownloadUrl, ReadyToPostKit } from "@/lib/queries";
import { triggerDownload } from "@/lib/download";
import ReadyToPostModal from "@/components/shared/ReadyToPostModal";

interface AIClipCardProps {
  id: string;
  title: string;
  thumbnail: string | null;
  clipUrl: string | null;
  score: number;
  scoreKey: string;
  duration: string;
  platform: string;
  createdAt: string | null;
  creatorAddress?: string;
  creatorName?: string;
  tippingEnabled?: boolean;
  readyToPostKit?: ReadyToPostKit | null;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800";

// ── Video preview modal ────────────────────────────────────────────────────────

function PreviewModal({
  clipUrl,
  title,
  onClose,
}: {
  clipUrl: string;
  title: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, []);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-auto max-w-[92vw] max-h-[92vh] bg-[#0B100E] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,229,143,0.12)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white hover:bg-black transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="relative bg-black flex-1 flex items-center justify-center cursor-pointer"
          onClick={toggle}
        >
          <video
            ref={videoRef}
            src={clipUrl}
            className="max-w-full max-h-[72vh] object-contain"
            onTimeUpdate={() => {
              if (!videoRef.current) return;
              const { currentTime, duration } = videoRef.current;
              setProgress(duration ? (currentTime / duration) * 100 : 0);
            }}
            onEnded={() => setPlaying(false)}
            muted={muted}
            playsInline
          />
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              playing ? "opacity-0 hover:opacity-100" : "opacity-100"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-brand/90 flex items-center justify-center shadow-lg">
              {playing
                ? <Pause className="w-6 h-6 text-black fill-black" />
                : <Play className="w-6 h-6 text-black fill-black ml-1" />
              }
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 bg-[#0B100E] border-t border-white/5 space-y-3">
          <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-brand rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm truncate max-w-[70%]">{title}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={toggle}
                className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-black hover:bg-brand-hover transition-colors"
              >
                {playing
                  ? <Pause className="w-4 h-4 fill-black" />
                  : <Play className="w-4 h-4 fill-black ml-0.5" />
                }
              </button>
              <button
                onClick={() => {
                  if (!videoRef.current) return;
                  videoRef.current.muted = !muted;
                  setMuted(!muted);
                }}
                className="text-[#5A6F65] hover:text-white transition-colors"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function AIClipCard({
  id,
  title,
  thumbnail,
  clipUrl,
  score: _score,
  scoreKey: _scoreKey,
  duration,
  platform,
  createdAt,
  creatorAddress,
  creatorName: _creatorName,
  tippingEnabled = false,
  readyToPostKit,
}: AIClipCardProps) {
  const { address } = useWallet();

  const [imgSrc, setImgSrc] = useState(thumbnail || FALLBACK);
  const [hovered, setHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showPostKit, setShowPostKit] = useState(false);
  const [tipReason, setTipReason] = useState<"download" | "post-kit">("download");
  // true when this wallet has already tipped and unlocked this clip
  const [unlocked, setUnlocked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setImgSrc(thumbnail || FALLBACK);
  }, [thumbnail]);

  // Check on mount (and when address changes) if this clip was previously unlocked
  useEffect(() => {
    if (!address) {
      setUnlocked(false);
      return;
    }
    setUnlocked(isUnlocked(id, address));
  }, [id, address]);

  const doDownload = (url: string) => {
    triggerDownload(url, title);
  };

  // Called when the clip is already unlocked — fetch URL and start download
  const handleDirectDownload = async () => {
    if (readyToPostKit?.downloadUrl) {
      doDownload(readyToPostKit.downloadUrl);
      return;
    }
    if (!clipUrl && !address) {
      setShowTipModal(true);
      return;
    }
    if (clipUrl && !tippingEnabled) {
      doDownload(clipUrl);
      return;
    }
    setDownloading(true);
    try {
      const { downloadUrl } = await getClipDownloadUrl(id, address || undefined);
      doDownload(downloadUrl);
    } catch {
      // If for any reason the direct download fails, fall back to the tip modal
      setShowTipModal(true);
    } finally {
      setDownloading(false);
    }
  };

  // Opens Post Kit, requiring a creator tip first if tipping is enabled and clip is locked
  const handleOpenPostKit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tippingEnabled && !unlocked) {
      setTipReason("post-kit");
      setShowTipModal(true);
      return;
    }
    setShowPostKit(true);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tippingEnabled && !unlocked) {
      setTipReason("download");
      setShowTipModal(true);
      return;
    }
    handleDirectDownload();
  };

  // Called by TipModal once tip is confirmed
  const handleTipComplete = (downloadUrl: string) => {
    setUnlocked(true);
    if (tipReason === "post-kit") {
      setShowTipModal(false);
      setShowPostKit(true);
    } else {
      doDownload(downloadUrl);
    }
  };

  const timeAgo = (date: string | null) => {
    if (!date) return null;
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      {showPreview && clipUrl && (
        <PreviewModal
          clipUrl={clipUrl}
          title={title}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showTipModal && (
        <TipModal
          clipId={id}
          clipTitle={title}
          onClose={() => setShowTipModal(false)}
          onDownloadReady={handleTipComplete}
        />
      )}

      {showPostKit && (
        <ReadyToPostModal
          clip={{
            id,
            title,
            thumbnail,
            clipUrl,
            duration,
            platform,
            readyToPostKit,
          }}
          onClose={() => setShowPostKit(false)}
        />
      )}

      <div
        className={`group relative bg-[#0B100E] border rounded-[24px] overflow-hidden transition-all duration-500 ${
          hovered
            ? "border-brand/40 shadow-[0_0_40px_rgba(0,229,143,0.08)] -translate-y-0.5"
            : "border-white/5"
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div
          className={`relative aspect-video overflow-hidden bg-[#060A08] ${clipUrl ? "cursor-pointer" : ""}`}
          onClick={() => clipUrl && setShowPreview(true)}
        >
          <Image
            src={imgSrc}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover transition-transform duration-700 ${hovered ? "scale-105" : "scale-100"}`}
            onError={() => setImgSrc(FALLBACK)}
          />

          <div className="absolute bottom-2.5 right-3 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-black text-white z-10">
            {duration}
          </div>

          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 z-10 ${
              hovered && clipUrl
                ? "opacity-100 bg-black/40 backdrop-blur-[2px]"
                : "opacity-0"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>

          {!clipUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <p className="text-[#5A6F65] text-[11px] font-medium">No preview</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="text-[13px] font-bold text-white truncate leading-tight group-hover:text-brand transition-colors">
              {title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#3A4A43] uppercase tracking-widest bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/5">
                {platform}
              </span>
              {createdAt && (
                <span className="text-[10px] text-[#3A4A43] font-medium">
                  {timeAgo(createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* Creator wallet address */}
          <div className="flex items-start gap-2 pt-2 border-t border-white/[0.04]">
            <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[8px] font-bold text-brand">C</span>
            </div>
            <div className="flex-1 min-w-0">
              {creatorAddress ? (
                <>
                  <p className="text-[9px] font-bold text-[#5A6F65] uppercase tracking-widest mb-0.5">
                    Creator wallet
                  </p>
                  <p
                    className="text-[9px] text-brand font-mono leading-relaxed cursor-pointer hover:text-white transition-colors"
                    title={creatorAddress}
                    onClick={() => navigator.clipboard?.writeText(creatorAddress).catch(() => {})}
                  >
                    {creatorAddress.length > 16
                      ? `${creatorAddress.slice(0, 8)}…${creatorAddress.slice(-6)}`
                      : creatorAddress}
                    <span className="ml-1 text-[#3A4A43]">(copy)</span>
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-[#3A4A43] font-medium">No wallet linked</p>
              )}
            </div>
            {tippingEnabled && creatorAddress && (
              <div className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md border mt-0.5 ${
                unlocked
                  ? "bg-brand/10 border-brand/20"
                  : "bg-white/5 border-white/10"
              }`}>
                {unlocked
                  ? <Unlock className="w-2.5 h-2.5 text-brand" />
                  : <Lock className="w-2.5 h-2.5 text-[#5A6F65]" />
                }
                <span className={`text-[8px] font-black uppercase tracking-wide ${unlocked ? "text-brand" : "text-[#5A6F65]"}`}>
                  {unlocked ? "Unlocked" : "Tip"}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="pt-2 border-t border-white/[0.06] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Row 1: Ready-to-Post Kit (Locked until creator is tipped) */}
            {tippingEnabled && !unlocked ? (
              <button
                onClick={handleOpenPostKit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0D1512] hover:bg-[#13201A] border border-brand/25 hover:border-brand/50 text-gray-200 hover:text-brand text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,143,0.06)] active:scale-[0.98] group/kit"
                title="Tip creator 1 XLM to unlock the Ready-to-Post Kit"
              >
                <Lock className="w-3.5 h-3.5 text-brand shrink-0 group-hover/kit:scale-110 transition-transform" />
                <span>Tip to Unlock Post Kit</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-brand text-[8px] font-black">
                  1 XLM
                </span>
              </button>
            ) : (
              <button
                onClick={handleOpenPostKit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 hover:border-brand/50 text-brand text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,143,0.1)] active:scale-[0.98]"
                title="Open Ready-to-Post Kit with captions & tags"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Ready-to-Post Kit</span>
                {tippingEnabled && unlocked && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-brand/20 text-brand text-[8px] font-black">
                    UNLOCKED
                  </span>
                )}
              </button>
            )}

            {/* Action Row 2: Download HD & Preview with clear spacing */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
              {/* Download / Tip-to-Download button */}
              {tippingEnabled && !unlocked ? (
                <button
                  onClick={handleDownloadClick}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand/30 text-gray-200 hover:text-brand text-[11px] font-bold transition-all active:scale-[0.98]"
                  title="Tip creator 1 XLM to unlock clip download"
                >
                  <Lock className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Tip to Download</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadClick}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand/30 text-gray-200 hover:text-brand text-[11px] font-bold transition-all disabled:opacity-50 active:scale-[0.98]"
                  title="Download HD Clip"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand shrink-0" />
                      <span>Downloading…</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-brand shrink-0" />
                      <span>Download HD</span>
                    </>
                  )}
                </button>
              )}

              {/* Preview button */}
              <button
                onClick={() => clipUrl && setShowPreview(true)}
                disabled={!clipUrl}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-[11px] font-bold transition-all disabled:opacity-30 active:scale-[0.98]"
                title={clipUrl ? "Preview clip with audio" : "No preview available"}
              >
                <Play className="w-3 h-3 fill-current text-white shrink-0 ml-0.5" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
