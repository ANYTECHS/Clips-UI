"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Link as LinkIcon,
  Upload,
  Sparkles,
  Check,
  Info,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { saveActiveJob } from "@/lib/processingStore";
import { useYouTubeImport, isYouTubeUrl } from "@/lib/useYouTubeImport";

export default function CreateClipsForm() {
  const router       = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activePlatform, setActivePlatform] = useState("TikTok");
  const [autoGenerate,   setAutoGenerate]   = useState(true);
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [urlValue,       setUrlValue]       = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  type UploadState = "idle" | "ready" | "uploading" | "processing";
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const { state: ytState, run: runYouTube, reset: resetYouTube } = useYouTubeImport();
  const ytBusy = ["fetching-info", "downloading", "uploading"].includes(ytState.phase);
  const anyBusy = loading || ytBusy;

  const platforms = [
    { name: "TikTok",    icon: "📱" },
    { name: "Instagram", icon: "📸" },
    { name: "YT Shorts", icon: "📺" },
  ];

  const platformToApiValue = (name: string): string => {
    if (name === "YT Shorts") return "youtube";
    return name.toLowerCase();
  };

  const isSupportedUrl = (val: string): boolean => {
    try {
      const { hostname } = new URL(val);
      const host = hostname.replace("www.", "");
      if (host === "youtube.com" || host === "youtu.be") return true;
      if (host === "tiktok.com" || host === "vm.tiktok.com" || host === "vt.tiktok.com") return true;
      if (host === "vimeo.com") return true;
      return false;
    } catch { return false; }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/") && !/\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)) {
        setError("Please select a valid video file (MP4, MOV, AVI, WEBM, or MKV).");
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError("File size exceeds 500MB limit. Please upload a smaller video.");
        return;
      }
      setSelectedFile(file);
      setUploadState("ready");
      setError("");
    }
  };

  // ── URL import ─────────────────────────────────────────────────────────────

  const handleFetchUrl = async () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    if (!isSupportedUrl(trimmed)) {
      setError("Only YouTube, TikTok, and Vimeo URLs are supported.");
      return;
    }
    setError("");
    resetYouTube();

    // YouTube — 5-step pipeline via useYouTubeImport
    if (isYouTubeUrl(trimmed)) {
      const result = await runYouTube(trimmed, platformToApiValue(activePlatform));
      if (result.videoId) router.push(`/dashboard/processing?videoId=${result.videoId}`);
      // errors surface via ytState.error panel below
      return;
    }

    // TikTok / Vimeo — existing from-url path (unchanged)
    setLoading(true);
    try {
      const response = await apiClient.post("/videos/from-url", {
        url:             trimmed,
        targetPlatforms: [platformToApiValue(activePlatform)],
        style:           "viral",
      });
      const data    = response.data;
      const videoId = data?.video?.id ?? data?.id ?? data?.data?.id ?? data?.videoId;
      if (!videoId) throw new Error("Failed to get video ID from response.");
      saveActiveJob(String(videoId));
      router.push(`/dashboard/processing?videoId=${videoId}`);
    } catch (err: any) {
      if (err.response?.status === 401) { setError("Session expired — redirecting to login…"); return; }
      if (err.response?.status === 429) { setError("Too many requests. Please wait a moment and try again."); return; }
      const msg = err.response?.data?.message ?? "Failed to submit URL. Please try again.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── File upload ────────────────────────────────────────────────────────────

  const handleUploadAndGenerate = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setUploadState("uploading");
    setError("");
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file",       selectedFile);
      formData.append("title",      selectedFile.name.replace(/\.[^/.]+$/, ""));
      formData.append("sourceType", "upload");
      formData.append("style",      "viral");

      const response = await apiClient.post("/videos", formData, {
        headers:          { "Content-Type": undefined },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
        timeout: 10 * 60 * 1000,
      });

      const data    = response.data;
      const videoId = data?.video?.id ?? data?.id ?? data?.data?.id ?? data?.videoId;
      if (!videoId) throw new Error("Failed to get video ID from response.");

      setUploadState("processing");
      setUploadProgress(100);
      saveActiveJob(String(videoId));
      router.push(`/dashboard/processing?videoId=${videoId}`);
    } catch (err: any) {
      const status = err.response?.status;
      let msg = err.response?.data?.message ?? err.message ?? "Upload failed. Please try again.";
      if (Array.isArray(msg)) msg = msg[0];
      if (status === 401) msg = "Session expired — redirecting to login…";
      else if (status === 429) msg = "Upload limit reached. Please wait a moment.";
      else if (status === 400) msg = "Invalid file. Use MP4, MOV, AVI, WEBM or MPEG under 2GB.";
      else if (status === 500) msg = "Server error during upload. Please try again shortly.";
      setError(msg);
      setUploadState(selectedFile ? "ready" : "idle");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Whether to show the YouTube progress/error panel
  const showYtPanel = ytState.phase !== "idle" && ytState.phase !== "done";

  const uploadButtonLabel = () => {
    if (uploadState === "uploading")
      return <><Loader2 className="w-5 h-5 animate-spin" />{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Uploading…"}</>;
    if (uploadState === "processing")
      return <><Loader2 className="w-5 h-5 animate-spin" />Generating Clips…</>;
    if (uploadState === "ready")
      return <><Sparkles className="w-5 h-5 fill-black" />Generate Clips</>;
    return <><Upload className="w-5 h-5" />Upload Video</>;
  };

  return (
    <div className="w-full bg-[#0C120F]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] glow-border relative overflow-hidden group">
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-brand/15 transition-all duration-700" />

      <div className="space-y-8 relative z-10">

        {/* ── URL import ── */}
        <div className="space-y-3">
          <label className="text-[11px] font-mono font-bold text-[#8E9F97] uppercase tracking-[0.16em] block ml-1">
            Import from URL (YouTube, TikTok, Vimeo)
          </label>

          <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 group/input">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#5A6F65] group-focus-within/input:text-brand transition-colors">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={urlValue}
                onChange={(e) => { setUrlValue(e.target.value); setError(""); resetYouTube(); }}
                onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                disabled={anyBusy}
                placeholder="Paste YouTube, TikTok or Vimeo link here…"
                className="w-full h-13 bg-[#080D0B] border border-white/10 focus:border-brand/70 focus:ring-1 focus:ring-brand/30 rounded-2xl pl-11 pr-4 text-[14px] font-medium placeholder-[#5A6F65] text-white transition-all outline-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleFetchUrl}
              disabled={anyBusy || !urlValue.trim()}
              className="px-7 py-3.5 bg-brand hover:bg-brand-hover text-black font-black rounded-2xl text-[14px] transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(0,229,143,0.25)] hover:shadow-[0_0_30px_rgba(0,229,143,0.4)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {anyBusy ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Fetch Video</span>
                </>
              )}
            </button>
          </div>

          {/* YouTube import progress / error panel */}
          {showYtPanel && (
            <div className={`rounded-2xl border px-5 py-4 space-y-3 transition-all ${
              ytState.phase === "error"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-brand/5 border-brand/20"
            }`}>
              {ytState.phase === "error" ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-400 font-medium leading-relaxed">
                    {ytState.error}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-brand" />
                      <span className="text-[13px] font-bold text-white truncate max-w-[220px]">
                        {ytState.videoTitle ?? "YouTube Import"}
                      </span>
                    </div>
                    <span className="text-[13px] font-black text-brand shrink-0 ml-3">
                      {ytState.progress >= 0 ? `${ytState.progress}%` : "…"}
                    </span>
                  </div>

                  <div className="h-2 bg-[#0B100E] rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,229,143,0.4)]"
                      style={{
                        width:   ytState.progress >= 0 ? `${ytState.progress}%` : "100%",
                        opacity: ytState.progress <  0 ? 0.35 : 1,
                      }}
                    />
                  </div>

                  <p className="text-[11px] font-medium text-[#5A6F65]">{ytState.label}</p>

                  {ytState.warning && (
                    <p className="text-[11px] text-yellow-400 font-medium">
                      ⚠ {ytState.warning}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="relative flex items-center justify-center py-1">
          <div className="absolute left-0 right-0 h-px bg-white/5" />
          <span className="relative z-10 px-5 bg-[#0C120F] text-[10px] font-mono font-bold text-[#5A6F65] uppercase tracking-[0.2em]">
            OR DROP RAW FOOTAGE
          </span>
        </div>

        {/* ── File upload area ── */}
        <div
          className={`group/upload relative ${anyBusy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          onClick={() => { if (!anyBusy) fileInputRef.current?.click(); }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />
          <div className="w-full aspect-[21/9] sm:aspect-[4.5/1] border-2 border-dashed border-white/10 group-hover/upload:border-brand/40 rounded-[24px] bg-white/[0.01] group-hover/upload:bg-brand/[0.02] flex flex-col items-center justify-center gap-3 transition-all duration-300 overflow-hidden p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#080D0B] border border-white/10 flex items-center justify-center group-hover/upload:scale-110 group-hover/upload:border-brand/30 transition-all duration-300 relative">
              <div className="absolute inset-0 bg-brand/5 blur-xl group-hover/upload:bg-brand/10 transition-colors rounded-full" />
              {selectedFile
                ? <Check className="w-5 h-5 text-brand relative z-10" />
                : <Upload className="w-5 h-5 text-[#8E9F97] group-hover/upload:text-brand relative z-10" />}
            </div>
            <div className="text-center space-y-1 relative z-10">
              <p className="text-[15px] font-bold text-white group-hover/upload:text-brand transition-colors">
                {selectedFile ? selectedFile.name : "Click to select video or drag & drop"}
              </p>
              <p className="text-[11px] font-mono text-[#5A6F65]">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing`
                  : "Supports MP4, MOV, WEBM, MKV up to 500MB"}
              </p>
            </div>
          </div>
        </div>

        {/* Generic error (TikTok / Vimeo / file) */}
        {error && (
          <div className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20">
            {error}
          </div>
        )}

        {/* File upload progress bar */}
        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[12px] font-bold text-[#5A6F65]">
              <span>Uploading to server…</span>
              <span className="text-brand">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-[#0B100E] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,229,143,0.4)]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#3A4A43] text-center">
              Large files may take a moment — do not close this tab
            </p>
          </div>
        )}

        {/* ── Platform + toggle ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="space-y-3 flex-1">
            <label className="text-[11px] font-mono font-bold text-[#8E9F97] uppercase tracking-[0.16em] block ml-1">
              Target Output Format
            </label>
            <div className="flex flex-wrap gap-2.5">
              {platforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => setActivePlatform(platform.name)}
                  className={`px-4.5 py-2.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                    activePlatform === platform.name
                      ? "bg-brand/10 border-brand/50 text-brand shadow-[0_0_15px_rgba(0,229,143,0.15)]"
                      : "bg-[#080D0B] border-white/5 text-[#8E9F97] hover:text-white hover:border-white/15"
                  }`}
                >
                  <span>{platform.icon}</span>
                  <span>{platform.name}</span>
                  {activePlatform === platform.name && <Check className="w-3.5 h-3.5 text-brand ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#080D0B] border border-white/5 rounded-2xl p-4 sm:p-5 lg:min-w-[320px] flex items-center justify-between group/toggle hover:border-brand/20 transition-all">
            <div className="space-y-0.5">
              <p className="text-[13.5px] font-bold text-white group-hover/toggle:text-brand transition-colors">
                Autonomous Viral Clipping
              </p>
              <p className="text-[11px] text-[#5A6F65]">Auto-extract 30s–60s retention spikes</p>
            </div>
            <button
              onClick={() => setAutoGenerate(!autoGenerate)}
              className={`w-12 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${autoGenerate ? "bg-brand" : "bg-[#1A221E]"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300 ${autoGenerate ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>

        {/* ── Footer action row ── */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-[12px] font-mono text-[#8E9F97]">
            <Info className="w-3.5 h-3.5 text-brand shrink-0" />
            <span>
              Estimated processing time: <strong className="text-white font-bold">2–4 minutes</strong>
            </span>
          </div>

          <button
            onClick={handleUploadAndGenerate}
            disabled={anyBusy || !selectedFile}
            className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:cursor-not-allowed cursor-pointer ${
              uploadState === "ready"
                ? "bg-brand hover:bg-brand-hover text-black shadow-[0_0_25px_rgba(0,229,143,0.3)] hover:shadow-[0_0_35px_rgba(0,229,143,0.5)]"
                : uploadState === "idle"
                ? "bg-[#080D0B] border border-white/10 text-[#5A6F65] opacity-50 cursor-not-allowed"
                : "bg-brand text-black opacity-80"
            }`}
          >
            {uploadButtonLabel()}
          </button>
        </div>

      </div>
    </div>
  );
}
