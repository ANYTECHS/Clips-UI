"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bot, Sparkles, Loader2,
  Zap, CreditCard, Crown, X,
} from "lucide-react";
import {
  getAgents,
  getMySubscription,
  checkUserHasEverClipped,
  type Agent,
  type StellarSubscription,
} from "@/lib/queries";
import { useWallet } from "@/components/WalletProvider";
import { useAuth } from "@/components/AuthProvider";
import { markFreeJobAsClaimed, useFreeJobClaimed } from "@/lib/freeJobStore";
import { loadActiveJob, clearActiveJob } from "@/lib/processingStore";
import AgentCard from "./AgentCard";
import HireAgentModal from "./HireAgentModal";

type Tab = "agents" | "jobs" | "subscription";

export default function AgentMarketplaceContent() {
  const queryClient  = useQueryClient();
  const router       = useRouter();

  const { address }                   = useWallet();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab,   setActiveTab]   = useState<Tab>("agents");
  const [hiringAgent, setHiringAgent] = useState<Agent | null>(null);
  const [latestJobId, setLatestJobId] = useState<number | null>(null);
  const [activeJob,   setActiveJob]   = useState<{ videoId: string; startedAt: number } | null>(null);

  useEffect(() => {
    const job = loadActiveJob();
    if (!job) return;
    const AGE_LIMIT = 30 * 60 * 1000;
    if (Date.now() - job.startedAt > AGE_LIMIT) {
      clearActiveJob();
      return;
    }
    setActiveJob(job);
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn:  getAgents,
    staleTime: 5 * 60_000,
  });

  const { data: subscription } = useQuery<StellarSubscription | null>({
    queryKey: ["mySubscription"],
    queryFn:  getMySubscription,
    staleTime: 30_000,
  });

  // Server-side verification: checks both /videos and /clips endpoints.
  // Even if clips are deleted from /projects, the parent video project persists on the backend!
  const { data: hasEverClipped = false, isLoading: checkingHistory } = useQuery<boolean>({
    queryKey: ["userHasEverClipped"],
    queryFn:  checkUserHasEverClipped,
    staleTime: 15_000,
  });

  const hasActiveSub = subscription?.status === "ACTIVE";

  const userIdentifiers = [user?.id, user?.email, address];
  const isClaimed = useFreeJobClaimed(userIdentifiers);

  // If user has ever created any video project or clips, permanently mark as claimed in local store
  useEffect(() => {
    if (hasEverClipped) {
      markFreeJobAsClaimed([user?.id, user?.email, address]);
    }
  }, [hasEverClipped, user?.id, user?.email, address]);

  // Welcome trial is only available for brand-new users who haven't subscribed,
  // haven't claimed, don't have an active job, and have NEVER created/clipped any project.
  const isFirstFreeJob =
    !authLoading &&
    !checkingHistory &&
    !hasActiveSub &&
    !isClaimed &&
    !activeJob &&
    !hasEverClipped;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleJobCreated = (jobId: number) => {
    setLatestJobId(jobId);
    setHiringAgent(null);
    setActiveTab("agents"); // Stay on Hire agent marketplace page!
    const job = loadActiveJob();
    if (job) setActiveJob(job);
    markFreeJobAsClaimed(userIdentifiers);
    queryClient.invalidateQueries({ queryKey: ["userHasEverClipped"] });
    queryClient.invalidateQueries({ queryKey: ["userClipCount"] });
    queryClient.invalidateQueries({ queryKey: ["userVideoCount"] });
    queryClient.invalidateQueries({ queryKey: ["sidebarClipCount"] });
    queryClient.invalidateQueries({ queryKey: ["agentJobs"] });
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "agents",       label: "Agents",       icon: Bot },
    // { key: "jobs",         label: "Jobs",         icon: BriefcaseBusiness },
    { key: "subscription", label: "Subscription", icon: Crown },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-[1400px] mx-auto w-full space-y-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-black tracking-widest uppercase">
            <Bot className="w-3.5 h-3.5" />
            On-Chain AI Agents
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-white leading-tight">
            Agent Marketplace
          </h1>
          <p className="text-[#5A6F65] text-[15px] font-medium max-w-lg leading-relaxed">
            Hire hireable AI agents to clip your videos. Pay $0.50 USDC per job or subscribe for
            unlimited jobs — all settled on the Stellar network.
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className="text-[26px] font-black text-white leading-none">{agents.length}</p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Agents</p>
          </div>
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className="text-[26px] font-black text-brand leading-none">
              {isFirstFreeJob ? "FREE" : "$0.50"}
            </p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">
              {isFirstFreeJob ? "1st Job" : "Per Job"}
            </p>
          </div>
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className={`text-[26px] font-black leading-none ${hasActiveSub ? "text-brand" : "text-[#3A4A43]"}`}>
              {hasActiveSub ? subscription!.plan : "—"}
            </p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Plan</p>
          </div>
        </div>
      </div>

      {/* ── Active Job Processing banner ── */}
      {activeJob && (
        <div className="relative flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-[#00FF85]/5 border border-[#00FF85]/20 shadow-[0_0_30px_rgba(0,255,133,0.05)]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#00FF85]/30 blur-md animate-pulse" />
              <div className="relative w-9 h-9 rounded-full bg-[#0A1510] border border-[#00FF85]/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#00FF85]" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-snug">
                AI Agent is clipping your video in the background
              </p>
              <p className="text-xs text-[#5A6F65] font-medium mt-0.5 truncate">
                Moments are being analyzed and rendered — watch live progress or stay right here
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push(`/dashboard/processing?videoId=${activeJob.videoId}`)}
              className="px-5 py-2 rounded-xl bg-[#00FF85] hover:bg-[#00e87a] text-black text-xs font-black tracking-wide transition-all active:scale-[0.97] shadow-[0_0_15px_rgba(0,255,133,0.25)]"
            >
              Watch Progress
            </button>
            <button
              onClick={() => {
                clearActiveJob();
                setActiveJob(null);
              }}
              aria-label="Dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 text-[#5A6F65] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── First Job Free Welcome Banner ── */}
      {isFirstFreeJob && (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-brand/15 via-[#0D1C16] to-[#0A0F0D] border border-brand/30 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,229,143,0.06)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,143,0.2)]">
                <Sparkles className="w-5 h-5 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-extrabold text-white">
                    Welcome Gift: Your 1st Agent Job is 100% Free!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-brand text-black text-[10px] font-black uppercase tracking-wider">
                    0.00 USDC
                  </span>
                </div>
                <p className="text-[13px] text-[#8E9895] mt-0.5">
                  We cover your first AI clipping job completely. Hire any agent below to test viral moment extraction with zero fee!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (agents.length > 0) setHiringAgent(agents[0]);
              }}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-black font-extrabold text-[12px] transition-all shadow-[0_0_15px_rgba(0,229,143,0.2)] shrink-0"
            >
              Claim Free Job →
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all ${
              activeTab === key
                ? "border-brand text-brand"
                : "border-transparent text-[#5A6F65] hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === "jobs" && latestJobId && (
              <span className="px-1.5 py-0.5 rounded-md bg-brand/20 text-brand text-[9px] font-black">NEW</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}

      {/* AGENTS */}
      {activeTab === "agents" && (
        <div>
          {agentsLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="w-16 h-16 rounded-[20px] bg-[#0B100E] border border-white/5 flex items-center justify-center">
                <Bot className="w-8 h-8 text-[#3A4A43]" />
              </div>
              <p className="text-white font-bold text-[16px]">No agents registered yet</p>
              <p className="text-[#5A6F65] text-[13px]">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onHire={setHiringAgent}
                  isFirstFreeJob={isFirstFreeJob}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTION */}
      {activeTab === "subscription" && (
        <SubscriptionPanel
          subscription={subscription ?? null}
          isLoading={false}
          onHireWithSub={() => {
            if (agents.length > 0) setHiringAgent(agents[0]);
            else setActiveTab("agents");
          }}
        />
      )}

      {/* ── Hire Modal ── */}
      {hiringAgent && (
        <HireAgentModal
          agent={hiringAgent}
          onClose={() => setHiringAgent(null)}
          onJobCreated={handleJobCreated}
        />
      )}
    </div>
  );
}

// ─── Subscription Panel ────────────────────────────────────────────────────────

const PLAN_DETAILS = {
  STARTER: { label: "Starter",  price: "$9.99/mo",  jobs: "20 jobs/mo",   color: "from-white/5 to-white/0",          badge: "text-white",    icon: Zap },
  CREATOR: { label: "Creator",  price: "$24.99/mo", jobs: "60 jobs/mo",   color: "from-brand/10 to-brand/0",         badge: "text-brand",    icon: Sparkles },
  PRO:     { label: "Pro",      price: "$49.99/mo", jobs: "150 jobs/mo",  color: "from-purple-400/10 to-purple-400/0", badge: "text-purple-400", icon: Crown },
};

function SubscriptionPanel({
  subscription,
  isLoading,
  onHireWithSub,
}: {
  subscription: StellarSubscription | null;
  isLoading: boolean;
  onHireWithSub: () => void;
}) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Current status card */}
      <div className="bg-[#0B100E] border border-white/5 rounded-[24px] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isActive ? "bg-brand/10 border border-brand/20 text-brand" : "bg-white/5 text-[#5A6F65]"
            }`}>
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-extrabold text-[18px]">
                  {isActive ? `${subscription.plan} Plan` : "No Active Subscription"}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isActive
                    ? "bg-brand/15 text-brand border border-brand/25"
                    : "bg-white/5 text-[#5A6F65]"
                }`}>
                  {isActive ? "Active" : "Free Tier"}
                </span>
              </div>
              <p className="text-[#5A6F65] text-[13px] mt-0.5">
                {isActive
                  ? `Renews / expires: ${new Date(subscription.expiresAt).toLocaleDateString()}`
                  : "Pay $0.50 USDC per job or subscribe to save up to 40%."}
              </p>
            </div>
          </div>

          {isActive && (
            <button
              onClick={onHireWithSub}
              className="px-5 py-2.5 rounded-[14px] bg-brand hover:bg-brand-hover text-black font-extrabold text-[13px] transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(0,229,143,0.2)] shrink-0"
            >
              Hire Agent (Subscribed)
            </button>
          )}
        </div>
      </div>

      {/* Plan comparison if not subscribed */}
      {!isActive && (
        <>
          <div>
            <h3 className="text-white font-extrabold text-[20px]">Choose a Monthly Plan</h3>
            <p className="text-[#5A6F65] text-[14px] mt-1">
              Billed in USDC on Stellar. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {(["STARTER", "CREATOR", "PRO"] as const).map((planKey) => {
              const p = PLAN_DETAILS[planKey];
              const Icon = p.icon;
              return (
                <div
                  key={planKey}
                  className={`relative rounded-[24px] bg-gradient-to-b ${p.color} bg-[#0A0F0D] border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-all`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${p.badge}`} />
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${p.badge}`}>
                        {p.label}
                      </span>
                    </div>

                    <div>
                      <p className="text-[28px] font-black text-white">{p.price}</p>
                      <p className="text-[12px] text-[#5A6F65] mt-0.5">{p.jobs}</p>
                    </div>
                  </div>

                  <button
                    onClick={onHireWithSub}
                    className="mt-6 w-full py-2.5 rounded-[12px] bg-white/5 hover:bg-white/10 text-white font-bold text-[13px] border border-white/5 transition-all"
                  >
                    Select Plan
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pay per job option */}
          <div className="flex items-center gap-4 px-5 py-4 rounded-[20px] bg-[#0B100E] border border-white/5">
            <CreditCard className="w-5 h-5 text-[#5A6F65] shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">No subscription needed</p>
              <p className="text-[12px] text-[#5A6F65]">Pay $0.50 USDC per job — no commitment, no monthly fee.</p>
            </div>
            <button
              onClick={onHireWithSub}
              className="px-5 py-2.5 rounded-[12px] bg-brand/10 border border-brand/20 text-brand font-bold text-[13px] hover:bg-brand/20 transition-all shrink-0"
            >
              Hire Now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
