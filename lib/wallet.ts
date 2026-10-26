"use client";

/**
 * Stellar Wallet integration using @creit-tech/stellar-wallets-kit v2
 *
 * This module initialises StellarWalletsKit once (singleton) and exposes
 * helper functions used by the WalletProvider context.
 *
 * The kit handles Freighter, xBull, Lobstr, Albedo, Rabet, Ledger etc.
 * through a unified API – no separate Freighter/Lobstr code needed.
 */

import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { FreighterModule } from "@creit-tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit-tech/stellar-wallets-kit/modules/lobstr";
import { AlbedoModule } from "@creit-tech/stellar-wallets-kit/modules/albedo";
import { RabetModule } from "@creit-tech/stellar-wallets-kit/modules/rabet";
import { Networks } from "@creit-tech/stellar-wallets-kit/types";

// Supports 'public', 'PUBLIC', or 'mainnet' for production — defaults to testnet
const rawNetwork = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "").trim().toLowerCase();
export const STELLAR_NETWORK =
  rawNetwork === "public" || rawNetwork === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

// Initialise the kit once on the client side
let kitInitialised = false;

export function initWalletKit(): void {
  if (kitInitialised || typeof window === "undefined") return;
  kitInitialised = true;

  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new LobstrModule(),
      new AlbedoModule(),
      new RabetModule(),
    ],
    network: STELLAR_NETWORK,
  });
}

/**
 * Opens the kit's built-in wallet picker modal.
 * Returns the connected Stellar public key (G…).
 */
export async function connectWalletModal(): Promise<string> {
  initWalletKit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

/**
 * Returns the currently cached address (does NOT open a modal).
 * Throws if no wallet is connected.
 */
export async function getWalletAddress(): Promise<string> {
  const { address } = await StellarWalletsKit.getAddress();
  return address;
}

/**
 * Opens the kit's profile modal (shows address, disconnect button, etc.)
 */
export async function openProfileModal(): Promise<void> {
  await StellarWalletsKit.profileModal();
}

/**
 * Disconnects the current wallet and clears kit state.
 */
export async function disconnectWallet(): Promise<void> {
  await StellarWalletsKit.disconnect();
}

/**
 * Signs a message with the connected wallet.
 */
export async function signAuthMessage(message: string): Promise<string> {
  initWalletKit();
  // Get the current address to ensure the correct account is signing
  const { address } = await StellarWalletsKit.getAddress();
  const { signedMessage } = await StellarWalletsKit.signMessage(message, {
    address,
  });
  return signedMessage;
}

/**
 * Signs a Stellar transaction XDR with the connected wallet.
 * Used for tipping transactions.
 *
 * IMPORTANT: networkPassphrase must be passed so the wallet signs against
 * the correct network. Without it, wallets like Freighter may use their own
 * default, producing a signature that Stellar rejects with tx_bad_auth.
 */
export async function signTransaction(xdr: string): Promise<string> {
  initWalletKit();
  const { address } = await StellarWalletsKit.getAddress();

  // Map our Networks enum value to the actual Stellar network passphrase string
  // that the wallets kit and Freighter both understand.
  const networkPassphrase =
    STELLAR_NETWORK === Networks.PUBLIC
      ? "Public Global Stellar Network ; September 2015"  // Mainnet passphrase
      : "Test SDF Network ; September 2015";               // Testnet passphrase

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}

/**
 * Normalises the signature from the wallet kit to a raw 128-character hex string.
 *
 * Freighter's signMessage returns a base64-encoded 64-byte Ed25519 signature.
 * The backend expects the same 64 bytes as lowercase hex (128 chars).
 *
 * Common failure modes this handles:
 *  - "ed25519:" prefix from some wallets
 *  - Base64 with or without padding ("=")
 *  - Already-hex strings passed through unchanged
 *  - Off-by-one from naive charCode loops (fixed by using Uint8Array)
 */
export function ensureHexSignature(signature: string): string {
  // Strip "ed25519:" prefix if present
  if (signature.startsWith("ed25519:")) {
    signature = signature.slice(8);
  }

  // Already a 128-char hex string — return as-is (lowercased)
  if (/^[0-9a-fA-F]{128}$/.test(signature)) {
    return signature.toLowerCase();
  }

  // Treat as Base64 → convert to hex via Uint8Array to avoid leading-zero drops
  try {
    // Normalise base64: replace URL-safe chars, restore padding
    const b64 = signature
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .replace(/\s/g, "");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    const binary = atob(padded);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert each byte to exactly 2 hex chars — no leading-zero drops
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Freighter's signMessage prepends a 2-byte prefix to the 64-byte Ed25519
    // signature, producing 66 bytes. Strip the first 2 bytes when present.
    const sigBytes = bytes.length === 66 ? bytes.slice(2) : bytes;
    const sigHex   = Array.from(sigBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Debug: log the conversion details
    console.log(
      "[ensureHexSignature] input len=%d, decoded bytes=%d, stripped=%s, hex len=%d",
      signature.length, bytes.length, bytes.length === 66, sigHex.length,
    );

    if (sigHex.length === 128) return sigHex;

    // Unexpected length — log and return raw so the error is visible
    console.warn("[ensureHexSignature] unexpected hex length:", sigHex.length, "(pre-strip hex was", hex.length, "chars)");
  } catch (e) {
    console.warn("[ensureHexSignature] base64 decode failed:", e);
  }

  // Last resort — return whatever we have
  return signature;
}

/**
 * Check whether a Stellar account has a USDC trustline on the current network.
 * Queries Horizon directly from the browser — uses testnet or mainnet based on
 * NEXT_PUBLIC_STELLAR_NETWORK.
 *
 * Returns true if the trustline exists, false if not.
 * Throws only on genuine network errors (account not found returns false).
 */
export async function hasUsdcTrustline(stellarAddress: string): Promise<boolean> {
  const horizonUrl =
    STELLAR_NETWORK === Networks.PUBLIC
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org";

  const usdcIssuer =
    STELLAR_NETWORK === Networks.PUBLIC
      ? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
      : "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  try {
    const res = await fetch(`${horizonUrl}/accounts/${stellarAddress}`);
    console.log(`[hasUsdcTrustline] checking ${stellarAddress} on ${horizonUrl} → HTTP ${res.status}`);

    if (res.status === 404) {
      console.warn("[hasUsdcTrustline] account not found — not activated yet");
      return false;
    }
    if (!res.ok) {
      console.warn("[hasUsdcTrustline] Horizon error", res.status);
      return false;
    }

    const data = await res.json();
    const balances: { asset_type: string; asset_code?: string; asset_issuer?: string }[] =
      data?.balances ?? [];

    console.log("[hasUsdcTrustline] balances:", JSON.stringify(balances));

    const found = balances.some(
      (b) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer
    );
    console.log(`[hasUsdcTrustline] USDC trustline found: ${found}`);
    return found;
  } catch (err) {
    // Log but don't block — let Horizon surface the real error on submit
    console.warn("[hasUsdcTrustline] fetch failed:", err);
    return true;
  }
}



/**
 * Submit a signed Stellar XDR transaction to the Horizon network.
 *
 * The backend's /stellar/agent/hire and /stellar/tips/submit endpoints
 * verify the payment by looking it up on Stellar Horizon — so the tx
 * must be submitted here first, before calling those endpoints.
 *
 * Returns the transaction hash on success.
 * Throws with a human-readable message on failure.
 */
export async function submitToStellar(signedXdr: string): Promise<string> {
  const horizonUrl =
    STELLAR_NETWORK === Networks.PUBLIC
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org";

  const body = new URLSearchParams({ tx: signedXdr });

  const res = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const codes   = data?.extras?.result_codes ?? {};
    const txCode  = codes?.transaction  ?? "";
    const opCodes: string[] = codes?.operations ?? [];

    // Always log the raw codes so they're visible in the browser console
    console.error("[submitToStellar] failed — result_codes:", JSON.stringify(codes));

    const isPublic = STELLAR_NETWORK === Networks.PUBLIC;
    const networkLabel = isPublic ? "Public (Mainnet)" : "Testnet";

    // ── Transaction-level codes ──────────────────────────────────────────────
    if (txCode === "tx_bad_auth") {
      throw new Error(
        `Transaction signature is invalid. Make sure your wallet network is set to ${networkLabel} and try again.`
      );
    }
    if (txCode === "tx_bad_seq") {
      throw new Error(
        "Sequence number mismatch — your account state changed. Please retry."
      );
    }
    if (txCode === "tx_no_account") {
      throw new Error(
        isPublic
          ? "Your Stellar account is not activated. Please fund it with at least 2 XLM first."
          : "Your Stellar account does not exist on testnet. Fund it at https://friendbot.stellar.org"
      );
    }
    if (txCode === "tx_insufficient_fee") {
      throw new Error("Transaction fee too low — please retry.");
    }

    // ── Operation-level codes ────────────────────────────────────────────────
    if (opCodes.includes("op_underfunded")) {
      throw new Error(
        isPublic
          ? "Insufficient XLM or USDC balance in your wallet."
          : "Insufficient XLM or USDC balance. Fund your testnet wallet at https://friendbot.stellar.org and ensure you have USDC."
      );
    }
    if (opCodes.includes("op_no_trust")) {
      throw new Error(
        "The receiving wallet does not have a USDC trustline enabled. Please contact support."
      );
    }
    if (opCodes.includes("op_line_full")) {
      throw new Error("Destination account's USDC trustline is full.");
    }
    if (opCodes.includes("op_no_destination")) {
      throw new Error(
        `Destination account does not exist on Stellar ${networkLabel}.`
      );
    }
    if (opCodes.includes("op_not_authorized")) {
      throw new Error("This asset requires authorization — contact the issuer.");
    }

    // ── Fallback: show the raw codes so the user/dev can act on them ─────────
    const txPart  = txCode  ? `tx: ${txCode}`                   : "";
    const opPart  = opCodes.length ? `ops: ${opCodes.join(", ")}` : "";
    const summary = [txPart, opPart].filter(Boolean).join(" | ") || "unknown error";
    throw new Error(`Stellar transaction failed (${summary})`);
  }

  const hash: string = data?.hash;
  if (!hash) throw new Error("Stellar returned no transaction hash.");
  return hash;
}

export { StellarWalletsKit, Networks };
