"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X, Bot, Link2, Loader2,
  Wallet, CreditCard, Zap,
  Upload, Film, Check, Sparkles, Gift,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { useAuth } from "@/components/AuthProvider";
import WalletButton from "@/components/shared/WalletButton";
import { useToast } from "@/components/shared/ToastProvider";
import { signTransaction, submitToStellar, hasUsdcTrustline } from "@/lib/wallet";
import { uploadToCloudinary, type CloudinaryUploadResult } from "@/lib/uploadToCloudinary";
import {
  buildAgentPaymentXdr, hireAgent,
  buildSubscriptionPaymentXdr, activateSubscription,
  getMySubscription, checkUserHasEverClipped,
  type Agent, type AgentJob, type StellarSubscription,
} from "@/lib/queries";
import { markFreeJobAsClaimed, useFreeJobClaimed } from "@/lib/freeJobStore";
import apiClient from "@/lib/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
type Step       = "config" | "uploading" | "payment" | "signing" | "submitting" | "done" | "error";

export default function HireAgentModal({ agent, onClose, onJobCreated }: HireAgentModalProps) {
  const router        = useRouter();
  const { address }   = useWallet();
  const { user }      = useAuth();
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [style,          setStyle]          = useState<Style>("viral");
  const [payMode,        setPayMode]        = useState<PayMode>("pay-per-job");
  const [selPlan,        setSelPlan]        = useState<"STARTER" | "CREATOR" | "PRO">("CREATOR");
  const [step,           setStep]           = useState<Step>("config");
  const [errMsg,         setErrMsg]         = useState("");

  const { data: subscription } = useQuery<StellarSubscription | null>({
    queryKey: ["mySubscription"],
    queryFn:  getMySubscription,
    staleTime: 30_000,
  });

  const { data: hasEverClipped = false, isLoading: checkingHistory } = useQuery<boolean>({
    queryKey: ["userHasEverClipped"],
    queryFn:  checkUserHasEverClipped,
    staleTime: 15_000,
  });

  const hasActiveSub = subscription?.status === "ACTIVE";

  const userIdentifiers = [user?.id, user?.email, address];
  const isClaimed = useFreeJobClaimed(userIdentifiers);

  useEffect(() => {
    if (hasEverClipped) {
      markFreeJobAsClaimed([user?.id, user?.email, address]);
    }
  }, [hasEverClipped, user?.id, user?.email, address]);

  const isFirstFreeJob =
    !checkingHistory &&
    !hasActiveSub &&
    !isClaimed &&
    !hasEverClipped;

  // First-time users do NOT need a wallet connected if they are logged in with email
  const canSubmit =
    (isFirstFreeJob ? (!!address || !!user) : !!address) &&
    !!selectedFile;

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

  // ── Upload file to Cloudinary ONLY (storage upload, no clipping initiated) ──

  const uploadVideoToCloudinary = async (): Promise<CloudinaryUploadResult> => {
    if (!selectedFile) throw new Error("No file selected.");
    setStep("uploading");
    setUploadProgress(0);

    const cloudResult = await uploadToCloudinary(selectedFile, (pct) => {
      setUploadProgress(pct >= 0 ? pct : 0);
    });

    return cloudResult;
  };

  // ── Core hire & payment transaction flow (Paid attempts only) ─────────────

  const runHireFlow = async (resolvedUrl: string) => {
    // Pre-flight: verify the user's wallet has a USDC trustline.
    const hasTrust = await hasUsdcTrustline(address!);
    if (!hasTrust) {
      throw new Error(
        "Your wallet does not have USDC enabled. Please open Freighter, go to 'Manage Assets', and add USDC before continuing."
      );
    }

    if (payMode === "pay-per-job") {
      setStep("payment");

      // 1. Build unsigned USDC XDR
      const { xdr } = await buildAgentPaymentXdr({
        senderAddress: address!,
        videoUrl: resolvedUrl,
        style,
      });

      // 2. Sign in wallet
      setStep("signing");
      const signedXdr = await signTransaction(xdr);
      if (!signedXdr) throw new Error("Transaction signature was cancelled.");

      // 3. Submit to Stellar Horizon — verify on-chain
      setStep("submitting");
      await submitToStellar(signedXdr);

      // 4. Hire agent on backend
      const job = await hireAgent({
        senderAddress: address!,
        videoUrl: resolvedUrl,
        style,
        signedXdr,
      });
      return job;
    } else {
      // Subscription flow
      setStep("payment");

      if (!hasActiveSub) {
        // 1. Build subscription XDR
        const { xdr } = await buildSubscriptionPaymentXdr({ senderAddress: address!, plan: selPlan });

        // 2. Sign in wallet
        setStep("signing");
        const signedXdr = await signTransaction(xdr);
        if (!signedXdr) throw new Error("Transaction signature was cancelled.");

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

  // ── Initiate AI video clipping ─────────────────────────────────────────────

  const startAgentClipProcessing = async (
    resolvedUrl: string,
    cloudResult: CloudinaryUploadResult | null,
    job: AgentJob | null
  ): Promise<string> => {
    // 1. If backend's hireAgent endpoint already created the video record
    const existingVideoId =
      (job as any)?.videoId ??
      (job as any)?.video?.id ??
      (job as any)?.video_id ??
      null;

    if (existingVideoId) {
      return String(existingVideoId);
    }

    // 2. Register video with backend to trigger clipping
    if (cloudResult) {
      const regRes = await apiClient.post("/videos/register", {
        cloudinaryUrl: cloudResult.secureUrl,
        publicId:      cloudResult.publicId,
        title:         selectedFile?.name.replace(/\.[^/.]+$/, "") ?? "Video",
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

      if (!videoId) throw new Error("Video uploaded but backend did not return video ID.");
      return String(videoId);
    }

    throw new Error("Please select a video file to upload.");
  };

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isFirstFreeJob && !address) {
      toast("Connect your Stellar wallet first to pay for this job.", "error");
      return;
    }
    if (!address && !user) {
      toast("Please sign in or create an account first.", "error");
      return;
    }
    if (!selectedFile) {
      toast("Please select a video file first.", "error");
      return;
    }

    try {
      // Step A: Upload file to Cloudinary storage
      const cloudResult = await uploadVideoToCloudinary();
      const resolvedUrl = cloudResult.secureUrl;

      if (isFirstFreeJob && payMode === "pay-per-job") {
        // ── Step B1: Free 1st Job — skip on-chain payment entirely ──
        setStep("submitting");

        // Register video directly to start AI clipping
        const videoId = await startAgentClipProcessing(resolvedUrl, cloudResult, null);

        // Mark free job as claimed for this user across all account identifiers & device
        markFreeJobAsClaimed(userIdentifiers);

        // Invalidate queries so UI knows clips are created
        queryClient.invalidateQueries({ queryKey: ["userHasEverClipped"] });
        queryClient.invalidateQueries({ queryKey: ["userClipCount"] });
        queryClient.invalidateQueries({ queryKey: ["sidebarClipCount"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["projectsData"] });
        queryClient.invalidateQueries({ queryKey: ["agentJobs"] });

        if (videoId) {
          saveActiveJob(videoId);
        }

        toast("✨ Free Agent Job started! Your video is being processed into viral clips.", "success");
        onClose();
        if (videoId) onJobCreated(Number(videoId) || 1);
        return;
      }

      // ── Step B2: Paid Flow — execute payment transaction first ──
      const job = await runHireFlow(resolvedUrl);

      // ── Step C: Transaction confirmed! Now start clipping ──
      setStep("done");

      let videoId: string | null = null;
      try {
        videoId = await startAgentClipProcessing(resolvedUrl, cloudResult, job);
      } catch (clipErr: any) {
        console.error("Failed to start clip processing:", clipErr);
        queryClient.invalidateQueries({ queryKey: ["userClipCount"] });
        queryClient.invalidateQueries({ queryKey: ["agentJobs"] });
        if (job?.id) onJobCreated(job.id);
        const clipMsg = clipErr?.response?.data?.message ?? clipErr?.message ?? "Failed to initialize clipping.";
        throw new Error(
          `Video clipping failed to start: ${
            Array.isArray(clipMsg) ? clipMsg[0] : clipMsg
          }`
        );
      }

      queryClient.invalidateQueries({ queryKey: ["userClipCount"] });
      queryClient.invalidateQueries({ queryKey: ["sidebarClipCount"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["projectsData"] });
      queryClient.invalidateQueries({ queryKey: ["agentJobs"] });
      if (job?.id) onJobCreated(job.id);

      const finalVideoId = videoId || (job?.id ? String(job.id) : null);
      if (finalVideoId) {
        saveActiveJob(finalVideoId);
      }

      toast("Payment confirmed! Taking you to the AI analysis…", "success");
      onClose();

      if (finalVideoId) {
        router.push(`/dashboard/processing?videoId=${finalVideoId}`);
      }
    } catch (err: any) {
      console.error("[HireAgentModal] Error during hire flow:", err);
      const rawMsg = err?.response?.data?.message ?? err?.message ?? "Something went wrong.";
      const status = err?.response?.status;
      let msg = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;

      if (status === 500 && (typeof msg !== "string" || msg.toLowerCase().includes("internal server error"))) {
        msg = "The backend failed to process transaction (500). Please check your wallet balance or try again.";
      }
      setErrMsg(msg);
      setStep("error");
    }
  };

  const isBusy =
    step === "uploading" ||
    step === "payment"   ||
    step === "signing"   ||
    step === "submitting" ||
    step === "done";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isBusy ? onClose : undefined}
      />

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
            onClick={!isBusy ? onClose : undefined}
            disabled={isBusy}
            className="p-2 rounded-xl text-[#5A6F65] hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* ── Config step ── */}
          {step === "config" && (
            <>
              {/* Wallet status / Free Welcome status */}
              {isFirstFreeJob ? (
                <div className="p-4 rounded-[18px] bg-gradient-to-r from-brand/15 via-[#0E1B15] to-[#0A100D] border border-brand/30 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,229,143,0.2)]">
                      <Sparkles className="w-4 h-4 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-extrabold text-white">First Agent Job is 100% Free!</p>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand text-black uppercase tracking-wider">
                          Welcome Credit
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8E9895] mt-1 leading-relaxed">
                        As a new creator, your first video clipping job is completely free—no 0.50 USDC fee or wallet payment required.
                      </p>
                    </div>
                  </div>
                  {user?.email && (
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#5A6F65] font-mono border-t border-white/5">
                      <span className="flex items-center gap-1.5 text-brand">
                        <Check className="w-3.5 h-3.5" /> Account: {user.email}
                      </span>
                      <span className="text-[10px] text-brand/80 font-bold uppercase tracking-wider">
                        Free Trial Active
                      </span>
                    </div>
                  )}
                  {address && !user?.email && (
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#5A6F65] font-mono border-t border-white/5">
                      <span className="flex items-center gap-1.5 text-brand">
                        <Check className="w-3.5 h-3.5 text-brand" /> Wallet linked: {address.slice(0, 6)}…{address.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              ) : !address ? (
                <div className="p-4 rounded-[18px] bg-[#0E1512] border border-amber-400/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Wallet className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-white">Stellar Wallet Required</p>
                        {user?.email && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-[#8E9895] border border-white/5 truncate max-w-[170px]"
                            title={user.email}
                          >
                            {user.email}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#8E9895] mt-1 leading-relaxed">
                        To hire this agent for paid clipping jobs ($0.50 USDC), connect your Stellar wallet (Freighter, Lobstr) to sign transactions.
                      </p>
                    </div>
                  </div>

                  <WalletButton
                    label="Add Wallet to Pay"
                    linkingLabel="Linking Wallet…"
                    iconClassName="w-4 h-4 text-black shrink-0"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] bg-brand hover:bg-brand-hover text-black font-extrabold text-[13px] transition-all shadow-[0_0_20px_rgba(0,229,143,0.2)] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-brand/5 border border-brand/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[10px] font-extrabold text-brand uppercase tracking-wider">Wallet Connected</p>
                        {user?.email && (
                          <span className="text-[10px] text-[#5A6F65] truncate">({user.email})</span>
                        )}
                      </div>
                      <p className="text-[12px] text-white font-mono truncate">{address}</p>
                    </div>
                  </div>
                  <WalletButton
                    compact
                    connectedLabel="Change"
                    className="text-[11px] text-[#5A6F65] hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 shrink-0"
                  />
                </div>
              )}

              {/* ── Video source selector (URL upload disabled per requirements) ── */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-[#5A6F65] uppercase tracking-wider">
                  Video Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] border border-brand/40 bg-brand/8 text-white select-none">
                    <Upload className="w-4 h-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-[13px] font-bold leading-tight">Upload File</p>
                      <p className="text-[10px] text-brand/70 mt-0.5">MP4, MOV, WEBM</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] border border-white/5 bg-[#0B100E]/50 text-[#3A4A43] cursor-not-allowed select-none opacity-50 relative"
                    title="URL upload is disabled on Hire Agent"
                  >
                    <Link2 className="w-4 h-4 shrink-0 text-[#3A4A43]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold leading-tight text-[#5A6F65]">Video URL</p>
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#5A6F65]">Disabled</span>
                      </div>
                      <p className="text-[10px] text-[#3A4A43] mt-0.5 truncate">Upload file directly</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── File upload area ── */}
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
                      <p className="text-[13px] font-bold text-white">Click to select video file</p>
                      <p className="text-[11px] text-[#3A4A43] mt-0.5">MP4, MOV, WEBM up to 500 MB</p>
                    </div>
                  )}
                </button>
              </div>

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
                    <div className="flex items-center justify-between mb-2">
                      {isFirstFreeJob ? (
                        <Gift className="w-5 h-5 text-brand" />
                      ) : (
                        <CreditCard className={`w-5 h-5 ${payMode === "pay-per-job" ? "text-brand" : "text-[#3A4A43]"}`} />
                      )}
                      {isFirstFreeJob && (
                        <span className="px-1.5 py-0.5 rounded-md bg-brand/20 text-brand text-[9px] font-black uppercase tracking-wider">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] font-bold ${payMode === "pay-per-job" ? "text-white" : "text-[#5A6F65]"}`}>
                      {isFirstFreeJob ? "1st Job Free" : "Pay per Job"}
                    </p>
                    <p className="text-[11px] text-[#3A4A43] mt-0.5">
                      {isFirstFreeJob ? (
                        <span className="text-brand font-bold">
                          $0.00 USDC <span className="line-through text-[#5A6F65] text-[10px] ml-1 font-normal">$0.50</span>
                        </span>
                      ) : (
                        "$0.50 USDC / job"
                      )}
                    </p>
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
                {isFirstFreeJob && payMode === "pay-per-job"
                  ? selectedFile
                    ? "Upload & Generate Free Clip ✨"
                    : "Select a Video File to Generate Free Clip ✨"
                  : !address
                  ? "Connect Wallet to Hire"
                  : selectedFile
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
                  : isFirstFreeJob
                  ? "Activating your free agent job…"
                  : "Submitting to Stellar network…"}
              </p>
              <p className="text-[#5A6F65] text-[13px] max-w-xs leading-relaxed">
                {step === "signing"
                  ? "Please confirm the transaction in your Stellar wallet (Freighter, Lobstr, etc.)"
                  : step === "submitting"
                  ? isFirstFreeJob
                    ? "Initializing AI clipping with your welcome credit…"
                    : "Broadcasting your USDC payment to the Stellar network…"
                  : "Preparing your USDC payment on the Stellar network…"}
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Check className="w-7 h-7 text-brand" />
              </div>
              <p className="text-white font-bold text-[16px]">Job Started!</p>
              <p className="text-[#5A6F65] text-[13px]">Your AI agent has begun processing clips.</p>
            </div>
          )}

          {/* ── Error step ── */}
          {step === "error" && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-bold text-[15px]">Failed to start job</p>
                <p className="text-[#8E9895] text-[12px] max-w-sm mx-auto leading-relaxed">
                  {errMsg || "An unexpected error occurred. Please try again."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("config")}
                  className="flex-1 py-3 rounded-[14px] bg-[#0B100E] border border-white/10 hover:border-white/20 text-white font-bold text-[13px] transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-[14px] bg-brand hover:bg-brand-hover text-black font-bold text-[13px] transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
