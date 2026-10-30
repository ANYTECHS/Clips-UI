"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Play,
  Download,
  Check,
  Trash2,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Pause,
  Sparkles,
} from "lucide-react";
import { triggerDownload } from "@/lib/download";
import ReadyToPostModal from "@/components/shared/ReadyToPostModal";
import { ReadyToPostKit } from "@/lib/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClipCardProps {
  id: string;
  title: string;
  thumbnail: string | null;
  clipUrl: string | null;
  score: number;
  scoreKey: string;
  duration: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  readyToPostKit?: ReadyToPostKit | null;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800";

// ─── Video Preview Modal ──────────────────────────────────────────────────────

function VideoModal({
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
    // Do NOT autoplay — browsers block audio on autoplay without a user gesture.
    // User must press play so the browser allows sound.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setProgress(duration ? (currentTime / duration) * 100 : 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime =
      ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-auto max-w-[90vw] max-h-[90vh] bg-[#0B100E] rounded-[24px] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,229,143,0.1)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src={clipUrl}
            className="max-w-full max-h-[75vh] object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
            muted={muted}
            playsInline
          />
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 group/btn transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-brand/90 hover:bg-brand flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                <Play className="w-7 h-7 text-black fill-black ml-1" />
              </div>
            </button>
          )}
        </div>

        <div className="px-6 py-4 bg-[#0B100E] border-t border-white/5 space-y-3">
          <div
            className="relative h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden group/bar"
            onClick={handleSeek}
          >
            <div
              className="absolute top-0 left-0 h-full bg-brand rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm truncate max-w-[60%]">{title}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !muted;
                    setMuted(!muted);
                  }
                }}
                className="text-[#5A6F65] hover:text-white transition-colors"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand text-xs font-bold hover:bg-brand/20 transition-colors"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-brand" />}
                {playing ? "Pause" : "Play with sound"}
              </button>
              <button
                onClick={() => triggerDownload(clipUrl, title)}
                className="text-[#5A6F65] hover:text-brand transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ClipCard ──────────────────────────────────────────────────────────────────

export default function ClipCard({
  id,
  title: initialTitle,
  thumbnail,
  clipUrl,
  score: _score,
  scoreKey: _scoreKey,
  duration,
  isSelected,
  onSelect,
  onDelete,
  readyToPostKit,
}: ClipCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgSrc, setImgSrc] = useState(thumbnail || FALLBACK_IMG);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { setImgSrc(thumbnail || FALLBACK_IMG); }, [thumbnail]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
    try { await onDelete(id); } catch { /* parent handles */ } finally { setIsDeleting(false); }
  };

  const openPreview = (e: React.MouseEvent) => { e.stopPropagation(); if (clipUrl) setShowPreview(true); };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadTarget = readyToPostKit?.downloadUrl || clipUrl;
    if (!downloadTarget) return;
    triggerDownload(downloadTarget, initialTitle);
  };

  const [showPostKit, setShowPostKit] = useState(false);

  return (
    <>
      {showPreview && clipUrl && (
        <VideoModal clipUrl={clipUrl} title={initialTitle} onClose={() => setShowPreview(false)} />
      )}

      {showPostKit && (
        <ReadyToPostModal
          clip={{
            id,
            title: initialTitle,
            thumbnail,
            clipUrl,
            duration,
            readyToPostKit,
          }}
          onClose={() => setShowPostKit(false)}
        />
      )}

      <div
        className={`group relative bg-[#0B100E] border rounded-[24px] overflow-hidden transition-all duration-500 ${
          isSelected
            ? "border-brand ring-1 ring-brand/20 shadow-[0_0_50px_rgba(0,229,143,0.15)]"
            : "border-white/5 hover:border-white/20"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={imgSrc}
            alt={initialTitle}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover"
            onError={() => setImgSrc(FALLBACK_IMG)}
          />

          {/* Selection checkbox */}
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(id); }}
            className={`absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer z-20 ${
              isSelected
                ? "bg-brand border-brand shadow-[0_0_15px_rgba(0,229,143,0.4)]"
                : "bg-black/40 border-white/20 hover:border-white/40 backdrop-blur-md"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-black stroke-[4px]" />}
          </div>

          {/* Play overlay */}
          <div
            onClick={openPreview}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 z-10 ${
              isHovered && clipUrl
                ? "opacity-100 bg-black/40 backdrop-blur-[2px] cursor-pointer"
                : "opacity-0"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-xl">
              <Play className="w-4 h-4 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Duration */}
          <div className="absolute bottom-2.5 right-3 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-black text-white z-20">
            {duration}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="space-y-1">
            <h4 className="text-[14px] font-bold text-white truncate tracking-tight leading-tight">
              {initialTitle}
            </h4>
            <p className="text-[11px] font-medium text-[#5A6F65]">
              Perfect for TikTok, Reels & Shorts
            </p>
          </div>

          {/* Action Row 1: Ready-to-Post Kit (Primary Action) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPostKit(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/25 hover:border-brand/40 text-brand text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,143,0.08)] active:scale-[0.98]"
            title="Open Ready-to-Post Kit with captions, hashtags & one-click sharing"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Ready-to-Post Kit</span>
          </button>

          {/* Action Row 2: Download HD, Preview & Delete with clear spacing */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={!clipUrl && !readyToPostKit?.downloadUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand/30 text-gray-200 hover:text-brand text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              title={clipUrl || readyToPostKit?.downloadUrl ? "Download HD Clip (MP4)" : "No download available"}
            >
              <Download className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Download</span>
            </button>

            {/* Preview button */}
            <button
              onClick={openPreview}
              disabled={!clipUrl}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-[11px] font-bold transition-all disabled:opacity-30 active:scale-[0.98]"
              title={clipUrl ? "Preview clip with audio" : "No preview available"}
            >
              <Play className="w-3 h-3 fill-current text-white shrink-0 ml-0.5" />
              <span>Preview</span>
            </button>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.03] hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-[#8E9895] hover:text-red-400 transition-all disabled:opacity-40 shrink-0 active:scale-[0.95]"
              title="Delete this clip"
              aria-label="Delete clip"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
