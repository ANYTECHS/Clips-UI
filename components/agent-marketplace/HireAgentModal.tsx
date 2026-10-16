"use client";

import React, { useState, useRef } from "react";
import {
  X, Bot, Link2, Loader2, CheckCircle2,
  AlertCircle, Wallet, CreditCard, Zap,
  Upload, Film, Check, Sparkles,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { useToast } from "@/components/shared/ToastProvider";
import { signTransaction, submitToStellar, hasUsdcTrustline } from "@/lib/wallet";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import {
  buildAgentPaymentXdr, hireAgent,
  buildSubscriptionPaymentXdr, activateSubscription,
  getMySubscription, getStellarAgentJob,
  type Agent, type StellarSubscription, type AgentJob,
} from "@/lib/queries";
import apiClient from "@/lib/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { saveActiveJob } from "@/lib/processingStore";

interface HireAgentModalProps {
  agent: Agent;
  onClose: () => void;
  onJobCreated: (jobId: number) => void;
}

const STYLES = ["viral", "comedy", "funny", "normal"] as const;
type Style = typeof STYLES[number];

const PLANS = [
  { key: "STARTER" as const, label: "Starter",  price: "$9.99/mo",  jobs: "20 jobs/mo",  color: "border-white/10" },
  { key: "CREATOR" as const, label: "Creator",  price: "$24.99/mo", jobs: "60 jobs/mo",  color: "border-brand/40" },
  { key: "PRO"     as const, label: "Pro",       price: "$49.99/mo", jobs: "150 jobs/mo", color: "border-purple-400/40" },
];

type PayMode    = "pay-per-job" | "subscription";
type VideoSource = "upload" | "url";
type Step       = "config" | "uploading" | "payment" | "signing" | "submitting" | "done" | "error";

export default function HireAgentModal({ agent, onClose, onJobCreated }: HireAgentModalProps) {
  const { address }   = useWallet();
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const router        = useRouter();
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [videoSource,    setVideoSource]    = useState<VideoSource>("upload");
  const [videoUrl,       setVideoUrl]       = useState("");
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [style,          setStyle]          = useState<Style>("viral");
  const [payMode,        setPayMode]        = useState<PayMode>("pay-per-job");
  const [selPlan,        setSelPlan]        = useState<"STARTER" | "CREATOR" | "PRO">("CREATOR");
  const [step,           setStep]           = useState<Step>("config");
  const [errMsg,         setErrMsg]         = useState("");
  const [createdJob,     setCreatedJob]     = useState<AgentJob | null>(null);

  const { data: subscription } = useQuery<StellarSubscription | null>({
    queryKey: ["mySubscription"],
    queryFn:  getMySubscription,
    staleTime: 30_000,
  });

  const hasActiveSub = subscription?.status === "ACTIVE";

  const isValidUrl = (v: string) => {
    try { new URL(v); return true; } catch { return false; }
  };

  // The effective video URL — either the typed URL or the Cloudinary URL after upload
  const effectiveUrl = videoSource === "url" ? videoUrl.trim() : "";
  const canSubmit =
    !!address &&
    (videoSource === "upload" ? !!selectedFile : isValidUrl(effectiveUrl));

  // ── File select ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/") && !/\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)) {
        toast("Please select a valid video file (MP4, MOV, AVI, WEBM, or MKV)", "error");
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        toast("File size exceeds 500MB limit", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  // ── Upload file to Cloudinary + register video, return { url, videoId } ───

  const uploadFile = async (): Promise<{ url: string; videoId: string }> => {
    if (!selectedFile) throw new Error("No file selected.");
    setStep("uploading");
    setUploadProgress(0);

    // 1. Upload to Cloudinary directly from browser
    const cloudResult = await uploadToCloudinary(selectedFile, (pct) => {
      setUploadProgress(pct >= 0 ? pct : 0);
    });

    // 2. Register with backend to get a videoId for the processing page
    const regRes = await apiClient.post("/videos/register", {
      cloudinaryUrl: cloudResult.secureUrl,
      publicId:      cloudResult.publicId,
      title:         selectedFile.name.replace(/\.[^/.]+$/, ""),
      sourceType:    "upload",
      style,
      duration:      cloudResult.duration,
      bytes:         cloudResult.bytes,
    });

    const videoId =
      regRes.data?.video?.id ??
      regRes.data?.id        ??
      regRes.data?.data?.id  ??
      null;

    if (!videoId) throw new Error("Upload succeeded but no video ID was returned.");

    return { url: cloudResult.secureUrl, videoId: String(videoId) };
  };

  // ── Register a URL video with backend to get a videoId ────────────────────

  const registerUrlVideo = async (url: string): Promise<string> => {
    const res = await apiClient.post("/videos/from-url", {
      url,
      style,
      targetPlatforms: [],
    });
    const videoId =
      res.data?.video?.id ??
      res.data?.id        ??
      res.data?.data?.id  ??
      null;
    if (!videoId) throw new Error("Failed to register video URL.");
    return String(videoId);
  };

  // ── Core hire flow (shared between pay-per-job and subscription) ───────────

  const runHireFlow = async (resolvedUrl: string) => {
    // Pre-flight: verify the user's wallet has a USDC trustline on the correct network.
    // This catches op_no_trust before we even build the XDR, with a clear message.
    const hasTrust = await hasUsdcTrustline(address!);
    if (!hasTrust) {
      const issuer =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
          : "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      throw new Error(
        `Your wallet has no USDC trustline on the ${
          process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet"
        }. ` +
        `In Freighter → Manage Assets → Add asset manually → code: USDC, issuer: ${issuer}`
      );
    }

    if (payMode === "pay-per-job") {
      setStep("payment");

      // 1. Build unsigned USDC XDR
      const { xdr } = await buildAgentPaymentXdr({ senderAddress: address!, videoUrl: resolvedUrl, style });

      // 2. Sign in wallet
      setStep("signing");
      const signedXdr = await signTransaction(xdr);

      // 3. Submit to Stellar Horizon — backend verifies by looking up the txHash
      setStep("submitting");
      await submitToStellar(signedXdr);

      // 4. Hire
      const job = await hireAgent({ senderAddress: address!, videoUrl: resolvedUrl, style, signedXdr });
      return job;
    } else {
      // Subscription flow
      setStep("payment");

      if (!hasActiveSub) {
        // 1. Build subscription XDR
        const { xdr } = await buildSubscriptionPaymentXdr({ senderAddress: address!, plan: selPlan });

        // 2. Sign
        setStep("signing");
        const signedXdr = await signTransaction(xdr);

        // 3. Submit to Horizon
        setStep("submitting");
        await submitToStellar(signedXdr);

        // 4. Activate subscription
        await activateSubscription({ senderAddress: address!, plan: selPlan, signedXdr });
        queryClient.invalidateQueries({ queryKey: ["mySubscription"] });
        toast("Subscription activated!", "success");
      }

      // 5. Hire using active subscription (no per-job payment needed)
      const job = await hireAgent({ senderAddress: address!, videoUrl: resolvedUrl, style });
      return job;
    }
  };

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!address) { toast("Connect your Stellar wallet first.", "error"); return; }

    try {
      let resolvedUrl = effectiveUrl;
      let videoId: string | null = null;

      if (videoSource === "upload") {
        // Upload to Cloudinary + register video → get videoId before payment
        const { url, videoId: vid } = await uploadFile();
        resolvedUrl = url;
        videoId = vid;
      } else {
        // Register the URL with the backend → get videoId before payment
        setStep("payment"); // show payment screen while registering
        videoId = await registerUrlVideo(resolvedUrl);
      }

      // Pay → sign → submit to Stellar → hire agent
      const job = await runHireFlow(resolvedUrl);

      queryClient.invalidateQueries({ queryKey: ["agentJobs"] });
      onJobCreated(job.id);

      // Payment confirmed — navigate straight to the AI processing page
      saveActiveJob(videoId!);
      onClose();
      router.push(`/dashboard/processing?videoId=${videoId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Something went wrong.";
      setErrMsg(Array.isArray(msg) ? msg[0] : msg);
      setStep("error");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#080C0B] border border-white/10 rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand/8 blur-[80px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-white">Hire Agent</h2>
              <p className="text-[11px] text-[#5A6F65]">{agent.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5A6F65] hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* ── Config step ── */}
          {step === "config" && (
            <>
              {/* Wallet status */}
              {!address ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-400/8 border border-yellow-400/20">
                  <Wallet className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-[13px] text-yellow-300 font-medium">
                    Connect your Stellar wallet to hire this agent.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand/8 border border-brand/20">
                  <Wallet className="w-4 h-4 text-brand shrink-0" />
                  <p className="text-[13px] text-brand font-mono truncate">{address}</p>
                </div>
              )}

              {/* ── Video source toggle ── */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider">
                  Video Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVideoSource("upload")}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-[14px] border text-left transition-all ${
                      videoSource === "upload"
                        ? "bg-brand/8 border-brand/40 text-white"
                        : "bg-[#0B100E] border-white/8 text-[#5A6F65] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Upload className={`w-4 h-4 shrink-0 ${videoSource === "upload" ? "text-brand" : "text-[#3A4A43]"}`} />
                    <div>
                      <p className="text-[13px] font-bold leading-tight">Upload File</p>
                      <p className="text-[10px] text-[#3A4A43] mt-0.5">MP4, MOV, WEBM</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setVideoSource("url")}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-[14px] border text-left transition-all ${
                      videoSource === "url"
                        ? "bg-brand/8 border-brand/40 text-white"
                        : "bg-[#0B100E] border-white/8 text-[#5A6F65] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Link2 className={`w-4 h-4 shrink-0 ${videoSource === "url" ? "text-brand" : "text-[#3A4A43]"}`} />
                    <div>
                      <p className="text-[13px] font-bold leading-tight">Video URL</p>
                      <p className="text-[10px] text-[#3A4A43] mt-0.5">YouTube, Vimeo…</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── File upload area ── */}
              {videoSource === "upload" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-[20px] p-6 flex flex-col items-center gap-3 transition-all group ${
                      selectedFile
                        ? "border-brand/40 bg-brand/5"
                        : "border-white/8 bg-[#0B100E] hover:border-brand/30 hover:bg-brand/[0.03]"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
                      selectedFile
                        ? "bg-brand/10 border-brand/30"
                        : "bg-[#111815] border-white/8 group-hover:border-brand/20"
                    }`}>
                      {selectedFile
                        ? <Check className="w-5 h-5 text-brand" />
                        : <Upload className="w-5 h-5 text-[#3A4A43] group-hover:text-brand transition-colors" />
                      }
                    </div>
                    {selectedFile ? (
                      <div className="text-center">
                        <p className="text-[13px] font-bold text-white truncate max-w-[260px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-[#5A6F65] mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[13px] font-bold text-white">Click to select a video</p>
                        <p className="text-[11px] text-[#3A4A43] mt-0.5">MP4, MOV, WEBM up to 2 GB</p>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* ── URL input ── */}
              {videoSource === "url" && (
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A4A43]" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    className="w-full bg-[#0B100E] border border-white/8 focus:border-brand/40 rounded-[14px] pl-12 pr-4 py-3 text-[14px] text-white placeholder-[#3A4A43] outline-none transition-all focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              )}

              {/* ── Clip Style ── */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider">Clip Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`py-2.5 rounded-[12px] text-[12px] font-bold capitalize border transition-all ${
                        style === s
                          ? "bg-brand/10 border-brand text-brand"
                          : "bg-[#0B100E] border-white/8 text-[#5A6F65] hover:text-white hover:border-white/20"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Payment mode ── */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider">Payment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPayMode("pay-per-job")}
                    className={`p-4 rounded-[16px] border text-left transition-all ${
                      payMode === "pay-per-job"
                        ? "bg-brand/8 border-brand/40"
                        : "bg-[#0B100E] border-white/8 hover:border-white/20"
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 mb-2 ${payMode === "pay-per-job" ? "text-brand" : "text-[#3A4A43]"}`} />
                    <p className={`text-[13px] font-bold ${payMode === "pay-per-job" ? "text-white" : "text-[#5A6F65]"}`}>
                      Pay per Job
                    </p>
                    <p className="text-[11px] text-[#3A4A43] mt-0.5">$0.50 USDC / job</p>
                  </button>
                  <button
                    onClick={() => setPayMode("subscription")}
                    className={`p-4 rounded-[16px] border text-left transition-all ${
                      payMode === "subscription"
                        ? "bg-brand/8 border-brand/40"
                        : "bg-[#0B100E] border-white/8 hover:border-white/20"
                    }`}
                  >
                    <Zap className={`w-5 h-5 mb-2 ${payMode === "subscription" ? "text-brand" : "text-[#3A4A43]"}`} />
                    <p className={`text-[13px] font-bold ${payMode === "subscription" ? "text-white" : "text-[#5A6F65]"}`}>
                      {hasActiveSub ? "Use Subscription" : "Subscribe"}
                    </p>
                    <p className="text-[11px] text-[#3A4A43] mt-0.5">
                      {hasActiveSub ? `${subscription?.plan} plan active` : "From $9.99/mo"}
                    </p>
                  </button>
                </div>

                {/* Plan picker — only shown when subscribing fresh */}
                {payMode === "subscription" && !hasActiveSub && (
                  <div className="grid grid-cols-3 gap-2">
                    {PLANS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setSelPlan(p.key)}
                        className={`p-3 rounded-[14px] border text-center transition-all ${
                          selPlan === p.key
                            ? `bg-brand/8 ${p.color}`
                            : "bg-[#0B100E] border-white/8 hover:border-white/20"
                        }`}
                      >
                        <p className={`text-[13px] font-bold ${selPlan === p.key ? "text-white" : "text-[#5A6F65]"}`}>
                          {p.label}
                        </p>
                        <p className="text-[11px] text-brand font-bold mt-0.5">{p.price}</p>
                        <p className="text-[10px] text-[#3A4A43] mt-0.5">{p.jobs}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Submit ── */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-4 rounded-[16px] bg-brand hover:bg-brand-hover text-black font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,229,143,0.15)]"
              >
                {videoSource === "upload" && selectedFile
                  ? payMode === "pay-per-job"
                    ? "Upload & Pay $0.50 USDC"
                    : hasActiveSub
                    ? "Upload & Use Subscription"
                    : `Upload & Subscribe (${PLANS.find((p) => p.key === selPlan)?.price})`
                  : payMode === "pay-per-job"
                  ? "Pay $0.50 USDC & Hire"
                  : hasActiveSub
                  ? "Use Subscription & Hire"
                  : `Subscribe (${PLANS.find((p) => p.key === selPlan)?.price}) & Hire`}
              </button>
            </>
          )}

          {/* ── Uploading to Cloudinary ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center">
              <div className="w-14 h-14 rounded-[20px] bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Film className="w-7 h-7 text-brand" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-[16px]">Uploading video…</p>
                <p className="text-[#5A6F65] text-[13px]">
                  {uploadProgress > 0 ? `${uploadProgress}%` : "Starting upload…"}
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-2 bg-[#0B100E] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,229,143,0.4)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-[#3A4A43]">Do not close this window</p>
            </div>
          )}

          {/* ── Payment / Signing / Submitting ── */}
          {(step === "payment" || step === "signing" || step === "submitting") && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <Loader2 className="w-12 h-12 text-brand animate-spin" />
              <p className="text-white font-bold text-[16px]">
                {step === "payment"
                  ? "Building transaction…"
                  : step === "signing"
                  ? "Waiting for wallet signature…"
                  : "Submitting to Stellar network…"}
              </p>
              <p className="text-[#5A6F65] text-[13px] max-w-xs leading-relaxed">
                {step === "signing"
                  ? "Please confirm the transaction in your Stellar wallet (Freighter, Lobstr, etc.)"
                  : step === "submitting"
                  ? "Broadcasting your USDC payment to the Stellar testnet…"
                  : "Preparing your USDC payment on the Stellar network…"}
              </p>
            </div>
          )}

          {/* ── Done — navigating to processing (brief flash) ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-brand animate-pulse" />
              </div>
              <p className="text-white font-extrabold text-[18px]">Payment confirmed!</p>
              <p className="text-[#5A6F65] text-[13px]">Taking you to AI processing…</p>
              <Loader2 className="w-5 h-5 text-brand animate-spin" />
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-bold text-[16px]">Something went wrong</p>
              <p className="text-red-300 text-[13px] max-w-xs leading-relaxed">{errMsg}</p>
              <button
                onClick={() => { setStep("config"); setUploadProgress(0); }}
                className="px-6 py-3 rounded-[14px] bg-[#0B100E] border border-white/10 text-white font-bold text-[14px] hover:border-white/20 transition-all"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
