"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Sparkles, Loader2,
  Zap, CreditCard, Crown,
} from "lucide-react";
import { getAgents, getMySubscription, type Agent, type StellarSubscription } from "@/lib/queries";
import AgentCard from "./AgentCard";
import HireAgentModal from "./HireAgentModal";

type Tab = "agents" | "jobs" | "subscription";

export default function AgentMarketplaceContent() {
  const queryClient  = useQueryClient();

  const [activeTab,   setActiveTab]   = useState<Tab>("agents");
  const [hiringAgent, setHiringAgent] = useState<Agent | null>(null);
  const [latestJobId, setLatestJobId] = useState<number | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn:  getAgents,
    staleTime: 5 * 60_000,
  });

  const { data: subscription, isLoading: subLoading } = useQuery<StellarSubscription | null>({
    queryKey: ["mySubscription"],
    queryFn:  getMySubscription,
    staleTime: 30_000,
  });

  const hasActiveSub = subscription?.status === "ACTIVE";

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleJobCreated = (jobId: number) => {
    setLatestJobId(jobId);
    setHiringAgent(null);
    setActiveTab("jobs");
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
            <p className="text-[26px] font-black text-brand leading-none">$0.50</p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Per Job</p>
          </div>
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className={`text-[26px] font-black leading-none ${hasActiveSub ? "text-brand" : "text-[#3A4A43]"}`}>
              {hasActiveSub ? subscription!.plan : "—"}
            </p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Plan</p>
          </div>
        </div>
      </div>

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
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOBS */}
      {/* {activeTab === "jobs" && (
        <JobsTab onViewClips={handleViewClips} />
      )} */}

      {/* SUBSCRIPTION */}
      {activeTab === "subscription" && (
        <SubscriptionPanel
          subscription={subscription ?? null}
          isLoading={subLoading}
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

  const hasActive = subscription?.status === "ACTIVE";
  const planInfo  = hasActive ? PLAN_DETAILS[subscription!.plan] : null;
  const PlanIcon  = planInfo?.icon ?? Crown;

  return (
    <div className="max-w-2xl space-y-6">
      {hasActive && subscription ? (
        <>
          {/* Active plan card */}
          <div className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${planInfo!.color} border border-white/10 p-7`}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <PlanIcon className={`w-6 h-6 ${planInfo!.badge}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[18px] font-extrabold text-white">{planInfo!.label} Plan</h3>
                    <span className={`px-2 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-black uppercase tracking-widest`}>
                      Active
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5A6F65] mt-0.5">{planInfo!.jobs} · {planInfo!.price}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 text-[13px]">
              <div>
                <p className="text-[#3A4A43] font-medium mb-0.5">Started</p>
                <p className="text-white font-semibold">
                  {new Date(subscription.startsAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-[#3A4A43] font-medium mb-0.5">Renews</p>
                <p className="text-white font-semibold">
                  {new Date(subscription.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[#3A4A43] font-medium mb-0.5">Stellar Address</p>
                <p className="text-white font-mono text-[12px] break-all">{subscription.stellarAddress}</p>
              </div>
            </div>

            <button
              onClick={onHireWithSub}
              className="mt-6 w-full py-3 rounded-[14px] bg-brand hover:bg-brand-hover text-black font-bold text-[14px] transition-all active:scale-[0.98]"
            >
              Use Subscription — Hire an Agent
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-[20px] font-extrabold text-white">Choose a Plan</h2>
            <p className="text-[#5A6F65] text-[13px]">
              Subscribe to unlock bulk jobs at a lower per-job cost. All payments settled in USDC on Stellar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(PLAN_DETAILS) as [string, typeof PLAN_DETAILS.STARTER][]).map(([key, plan]) => {
              const Icon = plan.icon;
              return (
                <div
                  key={key}
                  className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${plan.color} border border-white/10 p-5 flex flex-col gap-4 opacity-80 select-none`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${plan.badge}`} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-white">{plan.label}</p>
                        <p className={`text-[12px] font-bold ${plan.badge}`}>{plan.price}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#5A6F65] text-[10px] font-black uppercase tracking-wider">
                      Soon
                    </span>
                  </div>
                  <p className="text-[#5A6F65] text-[12px] font-medium">{plan.jobs}</p>
                  <button
                    disabled
                    aria-disabled="true"
                    className="mt-auto w-full py-2.5 rounded-[12px] bg-white/[0.03] border border-white/5 text-[#5A6F65] font-bold text-[13px] cursor-not-allowed transition-all"
                  >
                    Soon
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
