"use client";

import { useState, useEffect, useRef } from "react";
import { loadActiveJob } from "./processingStore";

const STORAGE_PREFIX = "clipcash_free_agent_job_";

/**
 * Helper to get all known user identifiers from arguments and localStorage.
 */
function resolveAllIdentifiers(
  userIdentifiers?: (string | null | undefined)[] | string | null
): string[] {
  const ids: string[] = [];

  const add = (val: any) => {
    if (val && typeof val === "string" && val.trim()) {
      const clean = val.trim().toLowerCase();
      if (!ids.includes(clean)) ids.push(clean);
    }
  };

  if (Array.isArray(userIdentifiers)) {
    userIdentifiers.forEach(add);
  } else if (userIdentifiers) {
    add(userIdentifiers);
  }

  if (typeof window !== "undefined") {
    try {
      add(localStorage.getItem("clipcash_current_user_id"));
      add(localStorage.getItem("clipcash_current_user_email"));
      add(localStorage.getItem("clipcash_current_user_address"));
    } catch {
      // ignore
    }
  }

  return ids;
}

/**
 * Returns true if the user or device has already used or claimed their free welcome job,
 * or if they currently have an active clipping job, or if they have ever generated a clip.
 */
export function hasClaimedFreeJob(
  userIdentifiers?: (string | null | undefined)[] | string | null
): boolean {
  if (typeof window === "undefined") return false;
  try {
    // 1. If device-wide claimed flags are set
    if (localStorage.getItem(`${STORAGE_PREFIX}claimed`) === "used") return true;
    if (localStorage.getItem(`${STORAGE_PREFIX}device_used`) === "used") return true;
    if (localStorage.getItem("clipcash_has_clipped_first_project") === "true") return true;

    // 2. If an active clipping job is currently running on this browser
    const active = loadActiveJob();
    if (active && active.videoId) return true;

    // 3. Check specific user identifiers (id, email, wallet address)
    const list = resolveAllIdentifiers(userIdentifiers);
    for (const id of list) {
      if (localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "used") return true;
      if (localStorage.getItem(`clipcash_user_has_clipped_${id}`) === "true") return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Marks the free job as used for this user across all their identifiers, device-wide,
 * and notifies all active React components to immediately re-render.
 */
export function markFreeJobAsClaimed(
  userIdentifiers?: (string | null | undefined)[] | string | null
): void {
  if (typeof window === "undefined") return;
  try {
    // Mark device-wide flags
    localStorage.setItem(`${STORAGE_PREFIX}claimed`, "used");
    localStorage.setItem(`${STORAGE_PREFIX}device_used`, "used");
    localStorage.setItem("clipcash_has_clipped_first_project", "true");

    // Mark all individual identifiers (user ID, email, wallet)
    const list = resolveAllIdentifiers(userIdentifiers);
    for (const id of list) {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, "used");
      localStorage.setItem(`clipcash_user_has_clipped_${id}`, "true");
    }

    // Dispatch event so all components update in real time
    window.dispatchEvent(new Event("clipcash_free_job_updated"));
  } catch {
    // ignore
  }
}

/**
 * Reactive React hook to track whether the free job has been claimed.
 */
export function useFreeJobClaimed(
  userIdentifiers?: (string | null | undefined)[] | string | null
): boolean {
  const [claimed, setClaimed] = useState<boolean>(() => hasClaimedFreeJob(userIdentifiers));

  const list = resolveAllIdentifiers(userIdentifiers);
  const cacheKey = list.sort().join(":");

  const idsRef = useRef(userIdentifiers);
  idsRef.current = userIdentifiers;

  useEffect(() => {
    setClaimed(hasClaimedFreeJob(idsRef.current));

    const onUpdate = () => {
      setClaimed(hasClaimedFreeJob(idsRef.current));
    };

    window.addEventListener("clipcash_free_job_updated", onUpdate);
    window.addEventListener("storage", onUpdate);

    return () => {
      window.removeEventListener("clipcash_free_job_updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [cacheKey]);

  return claimed;
}
