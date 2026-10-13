"use client";

import React from "react";
import { Bot, Zap, Wallet, ExternalLink } from "lucide-react";
import type { Agent } from "@/lib/queries";

interface AgentCardProps {
  agent: Agent;
  onHire: (agent: Agent) => void;
}

export default function AgentCard({ agent, onHire }: AgentCardProps) {
  const shortAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";

  return (
    <div className="group relative bg-[#0A0F0D] border border-white/5 rounded-[24px] p-6 flex flex-col gap-5 hover:border-brand/20 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,229,143,0.04)]">
      {/* Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand/5 blur-[60px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-brand" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-white leading-tight truncate">{agent.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-[11px] font-bold text-brand uppercase tracking-widest">Active</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-[#5A6F65] leading-relaxed line-clamp-3 flex-1">
        {agent.description}
      </p>

      {/* Meta */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#3A4A43] font-medium flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Price per job
          </span>
          <span className="text-white font-black">$0.50 USDC</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#3A4A43] font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Contract
          </span>
          <span className="text-[#5A6F65] font-mono">{shortAddress(agent.contractAddress)}</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#3A4A43] font-medium flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Agent wallet
          </span>
          <span className="text-[#5A6F65] font-mono">{shortAddress(agent.walletAddress)}</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onHire(agent)}
        className="w-full py-3 rounded-[14px] bg-brand hover:bg-brand-hover text-black font-bold text-[14px] transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(0,229,143,0.15)] hover:shadow-[0_0_30px_rgba(0,229,143,0.3)]"
      >
        Hire Agent
      </button>
    </div>
  );
}
