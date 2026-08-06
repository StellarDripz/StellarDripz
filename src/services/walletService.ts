import {
  isConnected,
  requestAccess,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";
import { STELLAR_CONFIG } from "@/config";
import type { NetworkType } from "@/types";

const STORAGE_KEY = "stellardripz_wallet";

export interface StoredWallet {
  publicKey: string;
  connectedAt: number;
}

/**
 * Check if Freighter browser extension is installed.
 */
export function checkFreighterInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return "freighterApi" in window;
}

/**
 * Detect the network Freighter is currently set to.
 * Returns "TESTNET", "MAINNET", or "UNKNOWN".
 */
export async function detectFreighterNetwork(): Promise<NetworkType> {
  try {
    const { network } = await getNetwork();
    if (network === "TESTNET") return "TESTNET";
    if (network === "PUBLIC" || network === "MAINNET") return "MAINNET";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

/**
 * Connect to Freighter: request access and retrieve the user's public key.
 * Throws descriptive errors for specific failure modes.
 */
export async function connectWallet(): Promise<{
  publicKey: string;
  network: NetworkType;
}> {
  if (!checkFreighterInstalled()) {
    throw new Error("FREIGHTER_NOT_INSTALLED");
  }

  const { isConnected: connected } = await isConnected();
  if (!connected) {
    throw new Error("FREIGHTER_LOCKED");
  }

  // Request access — user may reject
  let publicKey: string;
  try {
    const { address } = await requestAccess();
    publicKey = address;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("reject") || msg.includes("denied")) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("CONNECTION_FAILED");
  }

  if (!publicKey) {
    throw new Error("NO_ACCOUNT");
  }

  const network = await detectFreighterNetwork();

  // Persist connection state
  persistWallet({ publicKey, connectedAt: Date.now() });

  return { publicKey, network };
}

/**
 * Sign a Stellar transaction XDR using Freighter.
 * Returns the signed XDR string.
 */
export async function signTx(
  xdr: string
): Promise<string> {
  const { signedTxXdr } = await signTransaction(xdr, {
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  });
  return signedTxXdr;
}

// --- Persistence helpers ---

export function persistWallet(wallet: StoredWallet): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  } catch {
    // localStorage may be blocked
  }
}

export function loadPersistedWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (!parsed.publicKey) return null;
    // Expire after 24 hours
    if (Date.now() - parsed.connectedAt > 24 * 60 * 60 * 1000) {
      clearPersistedWallet();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedWallet(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
