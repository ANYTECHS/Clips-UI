"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Video, Play, Sparkles } from "lucide-react";

interface ProjectCardProps {
  id?: string | number;
  title: string;
  clipsCount: number;
  status: "processing" | "completed" | string;
  thumbnail?: string | null;
  videoUrl?: string | null;
  clips?: any[];
}

function resolveMedia(
  thumbnail?: string | null,
  videoUrl?: string | null,
  clips?: any[]
): { imageUrl: string | null; videoSrc: string | null } {
  const toCloudinaryThumb = (url: string) => {
    return url
      .replace(/\/video\/upload\/(?:v\d+\/)?/, "/video/upload/so_1,w_400,h_400,c_fill,q_auto,f_auto/")
      .replace(/\.(mp4|mov|webm|mkv|avi|m4v)$/i, ".jpg");
  };

  const toYouTubeThumb = (url: string) => {
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    return ytMatch?.[1] ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null;
  };

  if (thumbnail && typeof thumbnail === "string" && thumbnail.trim()) {
    const trimmed = thumbnail.trim();
    if (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/")) {
      return { imageUrl: toCloudinaryThumb(trimmed), videoSrc: null };
    }
    const yt = toYouTubeThumb(trimmed);
    if (yt) return { imageUrl: yt, videoSrc: null };
    return { imageUrl: trimmed, videoSrc: null };
  }

  if (Array.isArray(clips) && clips.length > 0) {
    for (const c of clips) {
      if (c?.thumbnail && typeof c.thumbnail === "string" && c.thumbnail.trim()) {
        return { imageUrl: c.thumbnail.trim(), videoSrc: null };
      }
      if (c?.clipUrl && typeof c.clipUrl === "string" && c.clipUrl.includes("cloudinary.com")) {
        return { imageUrl: toCloudinaryThumb(c.clipUrl.trim()), videoSrc: null };
      }
    }
  }

  if (videoUrl && typeof videoUrl === "string" && videoUrl.trim()) {
    const trimmed = videoUrl.trim();
    const yt = toYouTubeThumb(trimmed);
    if (yt) return { imageUrl: yt, videoSrc: null };
    if (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/")) {
      return { imageUrl: toCloudinaryThumb(trimmed), videoSrc: null };
    }
    if (/\.(mp4|webm|mov|m4v)/i.test(trimmed) || trimmed.startsWith("http")) {
      return { imageUrl: null, videoSrc: trimmed };
    }
  }

  if (Array.isArray(clips) && clips.length > 0 && clips[0]?.clipUrl) {
    return { imageUrl: null, videoSrc: clips[0].clipUrl };
  }

  return { imageUrl: null, videoSrc: null };
}

export default function ProjectCard({
  id,
  title,
  clipsCount,
  status,
  thumbnail,
  videoUrl,
  clips,
}: ProjectCardProps) {
  const { imageUrl, videoSrc } = useMemo(
    () => resolveMedia(thumbnail, videoUrl, clips),
    [thumbnail, videoUrl, clips]
  );

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl, videoSrc]);

  const cardContent = (
    <div className="group bg-[#0B100E] border border-white/8 rounded-[24px] p-4 sm:p-5 hover:border-brand/40 transition-all duration-300 hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.7)] cursor-pointer relative overflow-hidden">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shrink-0 bg-[#060A08] border border-white/5 flex items-center justify-center">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="96px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : videoSrc ? (
            <video
              src={`${videoSrc}#t=0.5`}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1714] to-[#060A08] text-brand/40 group-hover:text-brand/80 transition-colors">
              <Video className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}

          {/* Hover play button overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-brand text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h4 className="text-[14.5px] sm:text-[15px] font-bold text-white truncate group-hover:text-brand transition-colors tracking-tight">
            {title}
          </h4>
          <p className="text-[12px] text-[#7D8F86] font-medium font-mono">
            {clipsCount} {clipsCount === 1 ? "viral clip" : "viral clips"}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                status === "processing"
                  ? "bg-brand/15 text-brand border border-brand/30 animate-pulse shadow-[0_0_10px_rgba(0,229,143,0.2)]"
                  : "bg-white/[0.04] text-[#8E9F97] border border-white/8"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (id) {
    return (
      <Link href={`/projects?videoId=${id}`} className="block focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
