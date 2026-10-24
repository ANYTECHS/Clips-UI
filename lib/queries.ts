import apiClient from "./apiClient";

export const getDashboardData = async () => {
  try {
    const [videosRes, platformsRes] = await Promise.all([
      apiClient.get('/videos?page=1&limit=10'),
      apiClient.get('/platforms')
    ]);

    console.log("[getDashboardData] API responses:", {
      videos: videosRes.data,
      platforms: platformsRes.data
    });

    // Backend returns { data: [...], total, page, limit }
    const videos = videosRes.data.data || (Array.isArray(videosRes.data) ? videosRes.data : []);
    // Backend returns { success, connected, platforms: string[], accountCount }
    const connectedPlatforms = platformsRes.data.accountCount 
      ?? (Array.isArray(platformsRes.data.platforms) ? platformsRes.data.platforms.length : 0);
    
    // Function to get number of clips for a video
    const getClipsCount = (video: any) => {
      if (typeof video.clipsCount === 'number') return video.clipsCount;
      if (Array.isArray(video.clips)) return video.clips.length;
      return 0;
    };
    
    // Count total clips across all videos
    const totalClips = videos.reduce((acc: number, video: any) => acc + getClipsCount(video), 0);

    return {
      stats: {
        clips: totalClips.toString(),
        platforms: connectedPlatforms.toString(),
      },
      projects: videos.slice(0, 6).map((video: any) => ({
        ...video,
        id: video.id,
        title: video.title || "Untitled Video",
        clipsCount: getClipsCount(video),
        status: video.status || "completed",
        thumbnail: video.thumbnail || video.thumbnailUrl || video.thumb || video.coverUrl || video.poster || null,
        videoUrl: video.videoUrl || video.url || video.cloudinaryUrl || video.sourceUrl || null,
        clips: video.clips || [],
      })),
      totalVideos: videosRes.data.total || videos.length,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
};

export const getVideos = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`/videos?page=${page}&limit=${limit}`);
  
  // Function to get number of clips for a video
  const getClipsCount = (video: any) => {
    if (typeof video.clipsCount === 'number') return video.clipsCount;
    if (Array.isArray(video.clips)) return video.clips.length;
    return 0;
  };
  
  const rawItems = response.data.data || (Array.isArray(response.data) ? response.data : []);
  
  // Process each video to ensure clipsCount is set
  const items = rawItems.map((video: any) => ({
    ...video,
    clipsCount: getClipsCount(video)
  }));

  return {
    items,
    total: response.data.total || 0,
  };
};

export const getProjectsData = async (videoId?: string, page = 1, limit = 20) => {
  try {
    const extractClips = (resData: any): any[] => {
      if (!resData) return [];
      if (Array.isArray(resData)) return resData;
      if (Array.isArray(resData.data)) return resData.data;
      if (Array.isArray(resData.clips)) return resData.clips;
      if (Array.isArray(resData.data?.clips)) return resData.data.clips;
      if (Array.isArray(resData.video?.clips)) return resData.video.clips;
      return [];
    };

    let rawClips: any[] = [];

    // If videoId is provided, check the video clips endpoint first
    if (videoId) {
      try {
        const clipsRes = await apiClient.get(`/videos/${videoId}/clips?page=${page}&limit=${limit}`);
        rawClips = extractClips(clipsRes.data);
      } catch {
        // Fallback to GET /videos/:id
        try {
          const videoRes = await apiClient.get(`/videos/${videoId}`);
          rawClips = extractClips(videoRes.data);
        } catch { /* continue to generic /clips */ }
      }
    }

    // If still no clips (or videoId wasn't passed), query /clips
    if (rawClips.length === 0) {
      try {
        const endpoint = videoId ? `/clips?page=1&limit=50` : `/clips?page=${page}&limit=${limit}`;
        const response = await apiClient.get(endpoint);
        const allClips = extractClips(response.data);

        if (videoId && allClips.length > 0) {
          const matched = allClips.filter((c: any) => String(c.videoId) === String(videoId));
          rawClips = matched.length > 0 ? matched : allClips;
        } else {
          rawClips = allClips;
        }
      } catch (err) {
        console.warn("[getProjectsData] /clips fetch fallback error:", err);
      }
    }

    return rawClips.map((clip: any) => ({
      id: String(clip.id),
      title: clip.title || `Clip #${clip.id}`,
      thumbnail: clip.thumbnail || null,
      score: clip.viralScore ?? clip.score ?? 0,
      scoreKey: (clip.viralScore ?? clip.score ?? 0) >= 80 ? "high" : (clip.viralScore ?? clip.score ?? 0) >= 50 ? "medium" : "low",
      duration: clip.duration ? formatDuration(clip.duration) : "00:00",
      style: clip.platform || clip.style || "General",
      clipUrl: clip.clipUrl || null,
    }));
  } catch (error) {
    console.error("Failed to fetch projects data:", error);
    return [];
  }
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const deleteClip = async (id: string) => {
  await apiClient.delete(`/clips/${id}`);
};

export const getClipById = async (id: string) => {
  const response = await apiClient.get(`/clips/${id}`);
  return response.data;
};

export const createClip = async (data: any) => {
  const response = await apiClient.post(`/clips`, data);
  return response.data;
};

export const updateClip = async (id: string, data: any) => {
  const response = await apiClient.patch(`/clips/${id}`, data);
  return response.data;
};

// ─── Clip Info (public, no auth) ──────────────────────────────────────────────

export interface ClipInfo {
  id: number;
  title: string;
  thumbnail: string | null;
  clipUrl: string | null;
  duration: number | null;
  platform: string | null;
  createdAt: string;
  tippingEnabled: boolean;
  owner: {
    id: number;
    name: string | null;
    username: string | null;
    stellarAddress: string | null;
    walletConnected: boolean;
  };
}

export const getClipInfo = async (id: string): Promise<ClipInfo> => {
  const response = await apiClient.get(`/clips/${id}/info`);
  return response.data;
};

// ─── Clip Download (Tip-Gated) ─────────────────────────────────────────────────
// Pass senderAddress (the tipper's Stellar wallet) so the backend can look up
// confirmed tips by address — no JWT required on this endpoint.

export const getClipDownloadUrl = async (id: string, senderAddress?: string) => {
  const params = senderAddress ? { senderAddress } : {};
  const response = await apiClient.get(`/clips/${id}/download`, { params });
  return response.data;
};

// ─── Public Feed ───────────────────────────────────────────────────────────────

export const getPublicFeed = async (page = 1, limit = 20) => {
  const response = await apiClient.get(`/clips/feed?page=${page}&limit=${limit}`);
  const clips = response.data.data || (Array.isArray(response.data) ? response.data : []);
  return {
    items: clips.map((clip: any) => ({
      id: String(clip.id),
      title: clip.title || `Clip #${clip.id}`,
      thumbnail: clip.thumbnail || null,
      duration: clip.duration ? formatDuration(clip.duration) : "00:00",
      clipUrl: clip.clipUrl || null,
      creatorAddress: clip.creatorAddress || null,
      creatorName: clip.creatorName || null,
      createdAt: clip.createdAt || null,
    })),
    total: response.data.total || clips.length,
  };
};

// ─── Earnings Dashboard ─────────────────────────────────────────────────────────

export const getEarningsData = async () => {
  const response = await apiClient.get('/dashboard/earnings');
  return response.data;
};

// ─── Upload Progress SSE ───────────────────────────────────────────────────────

export const getUploadProgressUrl = (userId: string, videoId: string) => {
  return `/api/sse/events/upload-progress/${userId}/${videoId}`;
};

// ─── Platform Disconnect ─────────────────────────────────────────────────────────

export const disconnectPlatform = async (platform: string) => {
  await apiClient.delete(`/platforms/${platform}`);
};

// ─── Post Clip to Platforms ────────────────────────────────────────────────────

export const postClipToPlatforms = async (clipId: string, platforms: string[]) => {
  const response = await apiClient.post('/platforms/post-clip', {
    clipId,
    platforms,
  });
  return response.data;
};

// ─── Stellar Auth V2 ────────────────────────────────────────────────────────────

export const getStellarChallenge = async (stellarAddress: string) => {
  const response = await apiClient.get('/auth/stellar/challenge', {
    params: { stellarAddress },
  });
  return response.data;
};

export const connectStellarWallet = async (stellarAddress: string, signature: string, nonce: string) => {
  const response = await apiClient.post('/auth/stellar/connect', {
    stellarAddress,
    signature,
    nonce,
  });
  return response.data;
};

export const getConnectWalletChallenge = async (stellarAddress: string) => {
  // This endpoint returns the NEW structured challenge format with purpose: connect:
  //   "ClipsCash auth nonce: <uuid>\npublicKey: G...\npurpose: connect\nexpiresAt: ..."
  // That is the format StellarAuthService.connectWallet verifies. Do NOT use
  // /auth/stellar/challenge — that endpoint returns purpose: login and rejects
  // a `purpose` query param (400 "property purpose should not exist").
  // Likewise never use the legacy /auths/wallet/challenge (old WalletService format).
  const response = await apiClient.get('/auth/stellar/connect/challenge', {
    params: { stellarAddress },
  });
  return response.data as { challenge: string; message: string; expiresIn: string };
};

export const disconnectStellarWallet = async () => {
  await apiClient.delete('/auth/stellar/disconnect');
};

export const loginWithStellar = async (stellarAddress: string, signature: string, message: string) => {
  const response = await apiClient.post('/auth/stellar/login', {
    stellarAddress,
    signature,
    message,
  });
  return response.data;
};

// ─── Proof of Creation ─────────────────────────────────────────────────────────

export const getClipProof = async (clipId: string) => {
  const response = await apiClient.get(`/clips/${clipId}/proof`);
  return response.data;
};

// ─── Stellar Tips ───────────────────────────────────────────────────────────────

export const buildTipTransaction = async (clipId: number, amount: string, senderAddress: string) => {
  const response = await apiClient.post('/stellar/tips/build', {
    clipId,
    amount,
    senderAddress,
  });
  return response.data;
};

export const submitTipTransaction = async (clipId: number, signedXdr: string, senderAddress: string) => {
  const response = await apiClient.post('/stellar/tips/submit', {
    clipId,
    signedXdr,
    senderAddress,
  });
  return response.data;
};

export const getTipStatus = async (tipId: string) => {
  const response = await apiClient.get(`/stellar/tips/${tipId}`);
  return response.data;
};

// ─── Change Password ────────────────────────────────────────────────────────────

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await apiClient.patch('/users/me/password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};

// ─── Delete Video ───────────────────────────────────────────────────────────────

export const deleteVideo = async (videoId: string) => {
  await apiClient.delete(`/videos/${videoId}`);
};

// ─── Update Video ──────────────────────────────────────────────────────────────

export const updateVideo = async (videoId: string, data: any) => {
  const response = await apiClient.patch(`/videos/${videoId}`, data);
  return response.data;
};

// ─── Agent Marketplace ─────────────────────────────────────────────────────────

export interface Agent {
  id: number;
  name: string;
  description: string;
  pricePerJobBNB: string;
  walletAddress: string;
  contractAddress: string;
}

export interface AgentJob {
  id: number;
  contractJobId: string;
  videoUrl: string;
  style: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  clientAddress: string;
  txHash: string;
  resultClipIds: number[];
  agentId: number;
  createdAt: string;
}

export const getAgents = async (): Promise<Agent[]> => {
  const res = await apiClient.get("/agents");
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
};

export const getAgentById = async (id: number): Promise<Agent> => {
  const res = await apiClient.get(`/agents/${id}`);
  return res.data;
};

export const getAgentJobs = async (): Promise<AgentJob[]> => {
  const res = await apiClient.get("/agent/jobs");
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
};

export const getAgentJob = async (jobId: number): Promise<AgentJob> => {
  const res = await apiClient.get(`/agent/jobs/${jobId}`);
  return res.data;
};

export const createAgentJob = async (data: {
  videoUrl: string;
  clientAddress: string;
  style?: string;
  contractJobId?: string;
  txHash?: string;
}): Promise<AgentJob> => {
  const res = await apiClient.post("/agent/jobs", data);
  return res.data;
};

// ─── Stellar USDC Agent Payments ───────────────────────────────────────────────

export interface StellarSubscription {
  id: number;
  plan: "STARTER" | "CREATOR" | "PRO";
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  startsAt: string;
  expiresAt: string;
  stellarAddress: string;
}

export const buildAgentPaymentXdr = async (data: {
  senderAddress: string;
  videoUrl: string;
  style?: string;
}): Promise<{ xdr: string; memo: string; amount: string }> => {
  const res = await apiClient.post("/stellar/agent/build-payment", data);
  return res.data;
};

export const hireAgent = async (data: {
  senderAddress: string;
  videoUrl: string;
  style?: string;
  signedXdr?: string;
}): Promise<AgentJob> => {
  const res = await apiClient.post("/stellar/agent/hire", data);
  return res.data;
};

export const getStellarAgentJob = async (jobId: number): Promise<AgentJob> => {
  const res = await apiClient.get(`/stellar/agent/jobs/${jobId}`);
  return res.data;
};

export const getMySubscription = async (): Promise<StellarSubscription | null> => {
  try {
    const res = await apiClient.get("/stellar/subscriptions/my");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const buildSubscriptionPaymentXdr = async (data: {
  senderAddress: string;
  plan: "STARTER" | "CREATOR" | "PRO";
}): Promise<{ xdr: string; amount: string; plan: string }> => {
  const res = await apiClient.post("/stellar/subscriptions/build-payment", data);
  return res.data;
};

export const activateSubscription = async (data: {
  senderAddress: string;
  plan: "STARTER" | "CREATOR" | "PRO";
  signedXdr: string;
}): Promise<StellarSubscription> => {
  const res = await apiClient.post("/stellar/subscriptions/activate", data);
  return res.data;
};

export const cancelSubscription = async (): Promise<void> => {
  await apiClient.post("/stellar/subscriptions/cancel");
};
