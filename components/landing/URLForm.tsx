"use client";

import React, { useState } from "react";
import { Loader2, Link2, AlertCircle, Play, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { saveActiveJob } from "@/lib/processingStore";
import { useYouTubeImport, isYouTubeUrl } from "@/lib/useYouTubeImport";

interface URLFormProps {
  compact?: boolean;
}

export default function URLForm({ compact = false }: URLFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const { state: ytState, run: runYouTube, reset: resetYouTube } = useYouTubeImport();
  const ytBusy = ["fetching-info", "downloading", "uploading"].includes(ytState.phase);
  const anyBusy = ytBusy;

  const isSupported = (val: string): boolean => {
    try {
      const { hostname } = new URL(val);
      const host = hostname.replace("www.", "");
      if (host === "youtube.com" || host === "youtu.be") return true;
      if (host === "tiktok.com" || host === "vm.tiktok.com" || host === "vt.tiktok.com") return true;
      if (host === "vimeo.com") return true;
      return false;
    } catch {
      return false;
    }
  };

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anyBusy) return;

    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isSupported(trimmed)) {
      setError("Please provide a valid YouTube, TikTok, or Vimeo URL.");
      return;
    }

    setError("");
    resetYouTube();

    // ── YouTube pipeline ──
    if (isYouTubeUrl(trimmed)) {
      const result = await runYouTube(trimmed, "tiktok");
      if (result.videoId) router.push(`/dashboard/processing?videoId=${result.videoId}`);
      return;
    }

    // ── TikTok / Vimeo path ──
    try {
      const response = await apiClient.post("/videos/from-url", {
        url: trimmed,
        targetPlatforms: ["tiktok", "instagram"],
        style: "viral",
      });
      const data = response.data;
      const videoId = data?.video?.id ?? data?.id ?? data?.data?.id ?? data?.videoId;
      if (!videoId) throw new Error("Failed to get video ID from response.");
      saveActiveJob(String(videoId));
      router.push(`/dashboard/processing?videoId=${videoId}`);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError("Rate limit reached. Please wait a few seconds and try again.");
        return;
      }
      const message = err.response?.data?.message ?? "Something went wrong. Please check your link.";
      setError(Array.isArray(message) ? message[0] : message);
    }
  };

  const showYtPanel = ytState.phase !== "idle" && ytState.phase !== "done";

  return (
    <div className="w-full space-y-3">
      <form onSubmit={handleURLSubmit} className="relative flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Link2 className="w-4 h-4 text-[#5A6F65] group-focus-within:text-brand transition-colors" />
          </div>
          <input
            id="video-url-input"
            type="url"
            placeholder="Paste YouTube, TikTok or Vimeo link..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
              resetYouTube();
            }}
            disabled={anyBusy}
            className={`w-full bg-[#0B100E]/90 border ${
              error
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/10 focus:border-brand/60 focus:ring-1 focus:ring-brand/30"
            } rounded-2xl py-3.5 pl-11 pr-4 text-[14px] text-white placeholder-[#5A6F65] focus:outline-none focus:bg-[#0E1512] transition-all backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] disabled:opacity-50`}
          />
        </div>

        <button
          type="submit"
          disabled={anyBusy || !url.trim()}
          className="relative group overflow-hidden bg-brand hover:bg-brand-hover text-black px-7 py-3.5 rounded-2xl font-extrabold text-[14px] tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,143,0.25)] hover:shadow-[0_0_30px_rgba(0,229,143,0.4)] active:scale-[0.98] shrink-0"
        >
          {anyBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Analyzing</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-black" />
              <span>Generate Clips</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 pl-1 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* YouTube progress panel */}
      {showYtPanel && (
        <div
          className={`rounded-2xl border px-4 py-3 space-y-2 backdrop-blur-md transition-all ${
            ytState.phase === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-brand/[0.06] border-brand/20 text-brand"
          }`}
        >
          {ytState.phase === "error" ? (
            <div className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{ytState.error}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="font-bold text-white truncate">
                    {ytState.videoTitle ?? "YouTube Processing Pipeline"}
                  </span>
                </div>
                <span className="font-mono font-black text-brand shrink-0">
                  {ytState.progress >= 0 ? `${ytState.progress}%` : "Extracting…"}
                </span>
              </div>

              <div className="h-1.5 bg-[#080C0B] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,229,143,0.5)]"
                  style={{
                    width: ytState.progress >= 0 ? `${ytState.progress}%` : "100%",
                    opacity: ytState.progress < 0 ? 0.35 : 1,
                  }}
                />
              </div>

              <p className="text-[11px] font-medium text-[#7D8F86]">{ytState.label}</p>
              {ytState.warning && (
                <p className="text-[10px] text-amber-400 font-medium">⚠ {ytState.warning}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
