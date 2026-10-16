"use client";

/**
 * WalletButton
 *
 * Three states:
 *  - Not connected  → "Connect Wallet", opens the kit modal then runs the
 *                     correct challenge flow to link wallet to the account
 *  - Connecting     → spinner
 *  - Connected      → truncated address, click to open profile/disconnect
 *
 * For logged-in (email/Google) users the correct flow is:
 *   1. Open Freighter modal → get address
 *   2. GET /auth/stellar/connect/challenge?stellarAddress=G…  (purpose: connect)
 *   3. Sign the challenge string in Freighter
 *   4. POST /auth/stellar/connect  { stellarAddress, nonce/message, signature }
 *   5. Refresh /users/me so the UI reflects the linked address
 *
 * For visitors on the login page, pass onConnect(address) to handle post-connect
 * navigation (the AuthForm drives that path separately).
 */

import React, { useState } from "react";
import { Loader2, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { connectStellarWallet, getConnectWalletChallenge, disconnectStellarWallet } from "@/lib/queries";
import { signAuthMessage, ensureHexSignature, getWalletAddress } from "@/lib/wallet";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/shared/ToastProvider";

interface WalletButtonProps {
  className?: string;
  compact?: boolean;
  /** Responsive compact: hides label on mobile (<sm), visible on sm+ */
  responsiveCompact?: boolean;
  /** Called with the public key immediately after a successful wallet connect (login page use) */
  onConnect?: (address: string) => void;
}

function truncate(addr: string): string {
  if (addr.startsWith("G") && addr.length === 56) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({ className, compact = false, responsiveCompact = false, onConnect }: WalletButtonProps) {
  const { address, isConnecting, connect, openProfile, disconnect } = useWallet();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);

  const handleConnect = async () => {
    // Step 1 — open Freighter/wallet modal
    await connect();

    // Step 2 — read the address that was just connected
    let addr: string;
    try {
      addr = await getWalletAddress();
    } catch {
      // User closed the modal without connecting
      return;
    }

    // If there's a logged-in email/Google user, link the wallet to their account
    if (user) {
      setLinking(true);
      try {
        // Get the connect challenge (purpose: connect)
        const { challenge } = await getConnectWalletChallenge(addr);

        if (!challenge) {
          throw new Error("Could not get a challenge from the server.");
        }

        // Extract the nonce UUID from the challenge string.
        // Format: "ClipsCash auth nonce: <uuid>\npublicKey: G...\npurpose: connect\n..."
        const nonceMatch = challenge.match(/nonce:\s*([^\n\r]+)/i);
        const nonce      = nonceMatch?.[1]?.trim() ?? "";

        if (!nonce) {
          throw new Error("Could not extract nonce from challenge.");
        }

        // Sign the full challenge block — the backend verifies the signature
        // against exactly this string using Keypair.verify().
        // ensureHexSignature strips the 2-byte Freighter prefix to get clean 64 bytes.
        const rawSig    = await signAuthMessage(challenge);
        const signature = ensureHexSignature(rawSig);

        // POST { stellarAddress, nonce, signature } + JWT cookie (auto-sent)
        await connectStellarWallet(addr, signature, nonce);

        // Refresh user so stellarAddress is reflected everywhere
        const apiClientMod = (await import("@/lib/apiClient")).default;
        const { data: updatedUser } = await apiClientMod.get("/users/me");
        setUser(updatedUser);

        toast("Wallet linked to your account!", "success");
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to link wallet. Please try again.";
        toast(msg, "error");
        // Disconnect from kit so state isn't out of sync
        await disconnect();
      } finally {
        setLinking(false);
      }
    }

    // Notify parent (e.g. AuthForm on login page)
    onConnect?.(addr);
  };

  const handleDisconnect = async () => {
    try {
      try {
        await disconnectStellarWallet();
      } catch {
        // Backend disconnect may fail if already unlinked; proceed anyway
      }

      await openProfile(); // opens kit modal with disconnect option

      // Refresh user to clear stellarAddress — only if we still have a session.
      // After openProfile() the user may have ended their session, so guard
      // against a 401 here rather than triggering the refresh interceptor loop.
      try {
        const apiClient = (await import("@/lib/apiClient")).default;
        const { data: updatedUser } = await apiClient.get("/users/me");
        setUser(updatedUser);
      } catch (meErr: any) {
        // 401 means the session ended — clear the user from state and move on.
        if (meErr?.response?.status === 401) {
          setUser(null);
        }
        // Any other error is non-critical; wallet is already disconnected locally.
      }
    } catch (err) {
      console.error("Failed to disconnect wallet:", err);
    }
  };

  const busy = isConnecting || linking;
  const labelClass = compact ? "hidden" : responsiveCompact ? "hidden sm:inline" : "";

  if (address) {
    return (
      <button
        type="button"
        onClick={handleDisconnect}
        title={address}
        className={
          className ??
          "flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 transition-all font-bold text-sm"
        }
      >
        <Wallet className="w-4 h-4 shrink-0" />
        <span className={`${labelClass} tabular-nums`}>{truncate(address)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={busy}
      className={
        className ??
        "flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-[#1A221E]/60 border border-[#2A3B34] text-white hover:border-brand/50 hover:bg-[#1A221E] transition-all font-bold text-sm disabled:opacity-60"
      }
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <Wallet className="w-4 h-4 text-brand shrink-0" />
      )}
      <span className={labelClass}>
        {busy ? "Linking wallet…" : "Connect Wallet"}
      </span>
    </button>
  );
}
