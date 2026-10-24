"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getDashboardData, getVideos } from "@/lib/queries";
import { loadActiveJob, clearActiveJob } from "@/lib/processingStore";
import DashboardLayout from "@/components/shared/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import EarningsCard from "@/components/dashboard/EarningsCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { Video, Globe, ChevronDown, Loader2, Sparkles, X } from "lucide-react";

interface DashboardContentProps {
  stats: {
    earnings: string;
    clips: string;
    platforms: string;
  };
  projects: any[];
}

export default function DashboardContent({ stats: initialStats, projects: initialProjects }: DashboardContentProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allProjects, setAllProjects] = useState(initialProjects);

  // ── Resume banner ──────────────────────────────────────────────────────────
  // Read the store client-side only (localStorage is not available on the server)
  const [activeJob, setActiveJob] = useState<{ videoId: string; startedAt: number } | null>(null);

  useEffect(() => {
    const job = loadActiveJob();
    if (!job) return;

    // Verify the job isn't stale (older than 30 min means something went wrong
    // and we shouldn't keep nagging the user about it)
    const AGE_LIMIT = 30 * 60 * 1000;
    if (Date.now() - job.startedAt > AGE_LIMIT) {
      clearActiveJob();
      return;
    }
    setActiveJob(job);
  }, []);

  const dismissBanner = () => {
    clearActiveJob();
    setActiveJob(null);
  };

  const { data } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: getDashboardData,
    initialData: { stats: initialStats, projects: initialProjects, totalVideos: initialProjects.length },
  });

  const { stats } = data;
  const hasMore = allProjects.length < (data.totalVideos || 0);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await getVideos(nextPage);
      const newItems = response.items || [];
      setAllProjects(prev => [...prev, ...newItems]);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more projects:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-10 py-8 space-y-10 max-w-[1400px] mx-auto w-full">

        {/* ── Resume Processing banner ── */}
        {activeJob && (
          <div className="relative flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-[#00FF85]/5 border border-[#00FF85]/20 shadow-[0_0_30px_rgba(0,255,133,0.05)]">
            {/* animated glow dot */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#00FF85]/30 blur-md animate-pulse" />
                <div className="relative w-9 h-9 rounded-full bg-[#0A1510] border border-[#00FF85]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#00FF85]" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-snug">
                  Your video is still being processed
                </p>
                <p className="text-xs text-[#5A6F65] font-medium mt-0.5 truncate">
                  AI is cutting clips in the background — tap to watch progress
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push(`/dashboard/processing?videoId=${activeJob.videoId}`)}
                className="px-5 py-2 rounded-xl bg-[#00FF85] hover:bg-[#00e87a] text-black text-xs font-black tracking-wide transition-all active:scale-[0.97] shadow-[0_0_15px_rgba(0,255,133,0.25)]"
              >
                Resume
              </button>
              <button
                onClick={dismissBanner}
                aria-label="Dismiss"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 text-[#5A6F65] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            label="Total Clips Generated" 
            value={stats.clips} 
            trend="+8.2%" 
            icon={Video} 
          />
          <StatCard 
            label="Active Platforms" 
            value={stats.platforms} 
            trend="Steady" 
            icon={Globe} 
          />
        </div>

        {/* Middle Section: Earnings */}
        <div>
          <EarningsCard />
        </div>

        {/* Bottom Section: Recent Projects */}
        <div className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.04] pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Recent Projects</h3>
              <p className="text-xs text-[#7D8F86] mt-0.5">Videos analyzed and clipped by your autonomous engine</p>
            </div>
            <div className="text-xs font-mono font-bold text-[#7D8F86] bg-white/[0.03] px-3 py-1 rounded-full border border-white/5 self-start sm:self-auto">
              Showing {allProjects.length} of {data.totalVideos || allProjects.length}
            </div>
          </div>

          {allProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-[#0B100E] border border-white/5 rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Video className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white">No projects yet</p>
                <p className="text-sm text-[#7D8F86] max-w-sm">
                  Paste a YouTube, TikTok, or Vimeo link to generate your first batch of viral shorts.
                </p>
              </div>
              <button
                onClick={() => router.push("/clips")}
                className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,229,143,0.25)] transition-all active:scale-[0.98]"
              >
                Create First Clip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
              {allProjects.map((project: any, index: number) => (
                <ProjectCard 
                  key={project.id || index}
                  id={project.id}
                  title={project.title}
                  clipsCount={project.clipsCount}
                  status={project.status}
                  thumbnail={project.thumbnail}
                  videoUrl={project.videoUrl || project.url || project.cloudinaryUrl || project.sourceUrl}
                  clips={project.clips}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#0E1512] border border-white/10 text-white rounded-xl font-bold hover:bg-[#141E1A] hover:border-brand/30 transition-all disabled:opacity-50 text-sm shadow-sm"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                ) : (
                  <>
                    <span>Load More Projects</span>
                    <ChevronDown className="w-4 h-4 text-brand" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
