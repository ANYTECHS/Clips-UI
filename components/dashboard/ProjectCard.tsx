"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Video } from "lucide-react";

interface ProjectCardProps {
  id?: string | number;
  title: string;
  clipsCount: number;
  status: "processing" | "completed" | string;
  thumbnail?: string | null;
  videoUrl?: string | null;
  clips?: any[];
}

/**
 * Derives the best thumbnail image or video frame from video metadata
 */
function resolveMedia(
  thumbnail?: string | null,
  videoUrl?: string | null,
  clips?: any[]
): { imageUrl: string | null; videoSrc: string | null } {
  // Helper to convert Cloudinary video URLs to image snapshots
  const toCloudinaryThumb = (url: string) => {
    return url
      .replace(/\/video\/upload\/(?:v\d+\/)?/, "/video/upload/so_1,w_400,h_400,c_fill,q_auto,f_auto/")
      .replace(/\.(mp4|mov|webm|mkv|avi|m4v)$/i, ".jpg");
  };

  // Helper to extract YouTube thumbnail
  const toYouTubeThumb = (url: string) => {
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    return ytMatch?.[1] ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null;
  };

  // 1. Explicit thumbnail passed
  if (thumbnail && typeof thumbnail === "string" && thumbnail.trim()) {
    const trimmed = thumbnail.trim();
    if (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/")) {
      return { imageUrl: toCloudinaryThumb(trimmed), videoSrc: null };
    }
    const yt = toYouTubeThumb(trimmed);
    if (yt) return { imageUrl: yt, videoSrc: null };
    return { imageUrl: trimmed, videoSrc: null };
  }

  // 2. Check clips for a thumbnail or Cloudinary clipUrl
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

  // 3. Inspect videoUrl
  if (videoUrl && typeof videoUrl === "string" && videoUrl.trim()) {
    const trimmed = videoUrl.trim();

    // YouTube
    const yt = toYouTubeThumb(trimmed);
    if (yt) return { imageUrl: yt, videoSrc: null };

    // Cloudinary video
    if (trimmed.includes("cloudinary.com") && trimmed.includes("/video/upload/")) {
      return { imageUrl: toCloudinaryThumb(trimmed), videoSrc: null };
    }

    // Direct video stream / MP4 link (HTML5 video frame preview)
    if (/\.(mp4|webm|mov|m4v)/i.test(trimmed) || trimmed.startsWith("http")) {
      return { imageUrl: null, videoSrc: trimmed };
    }
  }

  // 4. Clip video fallback if main videoUrl was missing
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
  clips
}: ProjectCardProps) {
  const { imageUrl, videoSrc } = useMemo(
    () => resolveMedia(thumbnail, videoUrl, clips),
    [thumbnail, videoUrl, clips]
  );

  const [imgError, setImgError] = useState(false);

  // Reset error when thumbnail / video changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl, videoSrc]);

  const cardContent = (
    <div className="group bg-[#0B100E] border border-white/5 rounded-[28px] p-5 hover:border-brand/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,229,143,0.05)] cursor-pointer">
      <div className="flex items-center gap-5">
        <div className="w-24 h-24 rounded-[18px] overflow-hidden relative shrink-0 bg-[#060A08] border border-white/5 flex items-center justify-center">
          {imageUrl && !imgError ? (
            <Image 
              src={imageUrl} 
              alt={title} 
              fill 
              sizes="96px" 
              className="object-cover group-hover:scale-110 transition-transform duration-500" 
              onError={() => setImgError(true)}
            />
          ) : videoSrc ? (
            <video
              src={`${videoSrc}#t=0.5`}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1714] to-[#060A08] text-brand/40 group-hover:text-brand/70 transition-colors">
              <Video className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h4 className="text-[15px] font-bold text-white truncate group-hover:text-brand transition-colors">
            {title}
          </h4>
          <p className="text-[12px] text-[#5A6F65] font-medium">
            {clipsCount} {clipsCount === 1 ? "clip" : "clips"} generated
          </p>
          
          <div className="flex">
            <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
              status === "processing" 
                ? "bg-brand/10 text-brand border border-brand/20 shadow-[0_0_10px_rgba(0,229,143,0.15)]" 
                : "bg-white/[0.03] text-[#8e9895] border border-white/5"
            }`}>
              {status}
            </div>
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
