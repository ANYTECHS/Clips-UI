"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, TrendingUp, Clock, Zap, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import AIClipCard from "./AIClipCard";
import { ReadyToPostKit } from "@/lib/queries";

interface Clip {
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

interface AIProjectsContentProps {
  clips: Clip[];
  total?: number;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  isFetching?: boolean;
  onPageChange?: (newPage: number) => void;
}

const SORT_OPTIONS = [
  { key: "score", label: "Viral Score", icon: TrendingUp },
  { key: "newest", label: "Newest", icon: Clock },
  { key: "duration", label: "Duration", icon: Zap },
];

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  pages.push(1);

  if (currentPage > 3) {
    pages.push("...");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  pages.push(totalPages);
  return pages;
}

export default function AIProjectsContent({
  clips,
  total,
  currentPage = 1,
  totalPages = 1,
  limit = 20,
  isFetching = false,
  onPageChange,
}: AIProjectsContentProps) {
  const [sort, setSort] = useState("score");
  const [searchQuery, setSearchQuery] = useState("");

  const totalClipsCount = typeof total === "number" ? total : clips.length;

  const filtered = useMemo(() => {
    let result = [...clips];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((clip) => {
        const titleMatch = clip.title?.toLowerCase().includes(q);
        const creatorMatch = clip.creatorName?.toLowerCase().includes(q);
        const platformMatch = clip.platform?.toLowerCase().includes(q);
        const idMatch = clip.id?.toLowerCase().includes(q);
        return titleMatch || creatorMatch || platformMatch || idMatch;
      });
    }

    if (sort === "score") {
      result.sort((a, b) => b.score - a.score);
    } else if (sort === "newest") {
      result.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sort === "duration") {
      const toSecs = (d: string) => {
        const [m, s] = d.split(":").map(Number);
        return m * 60 + s;
      };
      result.sort((a, b) => toSecs(b.duration) - toSecs(a.duration));
    }

    return result;
  }, [clips, sort, searchQuery]);

  const highCount = clips.filter((c) => c.scoreKey === "high").length;
  const avgScore =
    clips.length > 0
      ? Math.round(clips.reduce((a, c) => a + c.score, 0) / clips.length)
      : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-[1400px] mx-auto w-full space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Public Feed
          </div>
         
          <p className="text-[#5A6F65] text-[15px] font-medium max-w-lg leading-relaxed">
            Discover viral clips from creators around the world. Browse, preview, and tip to download.
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className="text-[28px] font-black text-white leading-none">{totalClipsCount}</p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Total Clips</p>
          </div>
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className="text-[28px] font-black text-brand leading-none">{highCount}</p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">High Viral</p>
          </div>
          <div className="bg-[#0B100E] border border-white/5 rounded-2xl px-5 py-3 text-center">
            <p className="text-[28px] font-black text-white leading-none">{avgScore}</p>
            <p className="text-[10px] font-bold text-[#5A6F65] uppercase tracking-widest mt-1">Avg Score</p>
          </div>
        </div>
      </div>

      {/* ── Controls (Search, Sort & Top Pager) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6F65]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clips by title, creator, platform..."
            className="w-full bg-[#0B100E] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-[13px] text-white placeholder-[#5A6F65] focus:outline-none focus:border-brand/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6F65] hover:text-white transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Sort and Top Pager */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
          {/* Sort pills */}
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${
                  sort === key
                    ? "bg-brand text-black shadow-[0_0_20px_rgba(0,229,143,0.25)]"
                    : "bg-[#0B100E] border border-white/5 text-[#5A6F65] hover:text-white hover:border-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Top Quick Page Navigation (Prev / Next right at the top) */}
          {totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-1.5 bg-[#0B100E] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isFetching}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand/10 text-gray-200 hover:text-brand text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-brand" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <span className="text-[12px] text-[#5A6F65] font-semibold px-2 whitespace-nowrap">
                Page <span className="text-white font-bold">{currentPage}</span> of{" "}
                <span className="text-white font-bold">{totalPages}</span>
              </span>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isFetching}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand/10 text-gray-200 hover:text-brand text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4 text-brand" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <EmptyState
          totalClips={totalClipsCount}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((clip) => (
            <AIClipCard key={clip.id} {...clip} />
          ))}
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-12 border-t border-white/5">
          {/* Summary */}
          <p className="text-[13px] text-[#5A6F65] font-medium order-2 sm:order-1">
            Showing <span className="text-white font-bold">{Math.min((currentPage - 1) * limit + 1, totalClipsCount)}</span>
            {" – "}
            <span className="text-white font-bold">{Math.min(currentPage * limit, totalClipsCount)}</span>
            {" of "}
            <span className="text-brand font-bold">{totalClipsCount}</span> clips
          </p>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {/* Previous */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isFetching}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B100E] border border-white/10 hover:border-brand/40 text-gray-200 hover:text-white text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4 text-brand" />
              <span>Previous</span>
            </button>

            {/* Page number pills */}
            <div className="hidden sm:flex items-center gap-1.5">
              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                typeof p === "number" ? (
                  <button
                    key={idx}
                    onClick={() => onPageChange(p)}
                    disabled={isFetching}
                    className={`w-9 h-9 rounded-xl text-[12px] font-bold transition-all ${
                      p === currentPage
                        ? "bg-brand text-black font-black shadow-[0_0_15px_rgba(0,229,143,0.3)]"
                        : "bg-[#0B100E] border border-white/5 hover:border-white/20 text-[#8E9895] hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={idx} className="px-1 text-[#3A4A43] text-[12px] font-bold select-none">
                    {p}
                  </span>
                )
              )}
            </div>

            {/* Mobile current indicator */}
            <span className="sm:hidden text-[12px] text-gray-400 font-bold px-2">
              {currentPage} / {totalPages}
            </span>

            {/* Next */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isFetching}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B100E] border border-white/10 hover:border-brand/40 text-gray-200 hover:text-white text-[12px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              aria-label="Next Page"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 text-brand" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  totalClips,
  searchQuery,
  onClearSearch,
}: {
  totalClips: number;
  searchQuery?: string;
  onClearSearch?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
      <div className="w-20 h-20 rounded-[28px] bg-brand/10 border border-brand/20 flex items-center justify-center mb-2">
        <Sparkles className="w-9 h-9 text-brand" />
      </div>
      {searchQuery ? (
        <>
          <p className="text-white text-[18px] font-extrabold">No clips matching &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-[#5A6F65] text-[14px] font-medium max-w-xs leading-relaxed">
            Try checking for typos or searching by a different title or creator.
          </p>
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="px-4 py-2 rounded-xl bg-brand/10 border border-brand/30 text-brand text-[13px] font-bold hover:bg-brand/20 transition-all mt-2"
            >
              Clear search
            </button>
          )}
        </>
      ) : totalClips === 0 ? (
        <>
          <p className="text-white text-[18px] font-extrabold">No clips in the feed yet</p>
          <p className="text-[#5A6F65] text-[14px] font-medium max-w-xs leading-relaxed">
            Check back soon to discover viral clips from creators.
          </p>
        </>
      ) : null}
    </div>
  );
}
