/**
 * Multi-wallet service.
 * Provides a unified interface for connecting to and signing with
 * multiple Stellar wallets. Currently supports:
 *   - Freighter (browser extension)
 *   - xBull (browser extension) 
 *   - Albedo (web-based)
 *   - LOBSTR (browser extension)
 *   - Rabet (browser extension)
 *
 * Falls back gracefully if a wallet is not installed.
 */
import { STELLAR_CONFIG } from "@/config";
import type { NetworkType, SupportedWallet } from "@/types";

// ---- Wallet Registry ----

const WALLET_REGISTRY: {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  /** Check if wallet is installed/available in the browser */
  checkInstalled: () => boolean;
}[] = [
  {
    id: "freighter",
    name: "Freighter",
    icon: "🦊",
    installUrl: "https://www.freighter.app/",
    checkInstalled: () =>
      typeof window !== "undefined" && "freighterApi" in window,
  },
  {
    id: "xbull",
    name: "xBull",
    icon: "🐂",
    installUrl: "https://xbull.app/",
    checkInstalled: () =>
      typeof window !== "undefined" && "xBullSDK" in window,
  },
  {
    id: "albedo",
    name: "Albedo",
    icon: "☀️",
    installUrl: "https://albedo.link/",
    checkInstalled: () => true, // Web-based, always available
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    icon: "🐙",
    installUrl: "https://lobstr.co/",
    checkInstalled: () =>
      typeof window !== "undefined" && "lobstr" in window,
  },
  {
    id: "rabet",
    name: "Rabet",
    icon: "🚀",
    installUrl: "https://rabet.io/",
    checkInstalled: () =>
      typeof window !== "undefined" && "rabet" in window,
  },
];

/** Get list of all supported wallets with install status. */
export function getSupportedWallets(): SupportedWallet[] {
  return WALLET_REGISTRY.map((w) => ({
    id: w.id,
    name: w.name,
    iconUrl: w.icon,
    installed: w.checkInstalled(),
  }));
}

/** Check if at least one supported wallet is available. */
export function checkAnyWalletInstalled(): boolean {
  return WALLET_REGISTRY.some((w) => w.checkInstalled());
}

// ---- Storage ----

const STORAGE_KEY = "stellardripz_wallet";

interface StoredWallet {
  publicKey: string;
  walletId: string;
  walletName: string;
  connectedAt: number;
}

export function persistWallet(wallet: StoredWallet): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  } catch { /* blocked */ }
}

export function loadPersistedWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (!parsed.publicKey || !parsed.walletId) return null;
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
  } catch { /* ignore */ }
}

export function resetKit(): void {
  // No kit state to reset in this implementation
}

// ---- Connection ----

/**
 * Connect to a wallet by ID.
 * Currently Freighter is the primary supported wallet with full integration.
 * Other wallets show a coming-soon message.
 */
export async function connectWithWallet(
  walletId: string
): Promise<{
  publicKey: string;
  network: NetworkType;
  walletId: string;
  walletName: string;
}> {
  const wallet = WALLET_REGISTRY.find((w) => w.id === walletId);
  if (!wallet) {
    throw new Error("UNSUPPORTED_WALLET");
  }

  if (!wallet.checkInstalled()) {
    throw new Error("WALLET_NOT_INSTALLED");
  }

  // Route to the appropriate wallet connector
  switch (walletId) {
    case "freighter":
      return connectFreighter(walletId, wallet.name);
    case "xbull":
      return connectXBull(walletId, wallet.name);
    case "albedo":
      return connectAlbedo(walletId, wallet.name);
    default:
      throw new Error(
        `Wallet "${wallet.name}" is listed but not yet fully integrated. ` +
        `Please use Freighter for full functionality.`
      );
  }
}

async function connectFreighter(
  walletId: string,
  walletName: string
): Promise<{
  publicKey: string;
  network: NetworkType;
  walletId: string;
  walletName: string;
}> {
  const {
    isConnected,
    requestAccess,
    getNetwork,
  } = await import("@stellar/freighter-api");

  const { isConnected: connected } = await isConnected();
  if (!connected) {
    throw new Error("FREIGHTER_LOCKED");
  }

  let publicKey: string;
  try {
    const { address } = await requestAccess();
    publicKey = address;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("reject") || msg.includes("denied")) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("CONNECTION_FAILED");
  }

  if (!publicKey) {
    throw new Error("NO_ACCOUNT");
  }

  let network: NetworkType = "UNKNOWN";
  try {
    const { network: fNetwork } = await getNetwork();
    if (fNetwork === "TESTNET") network = "TESTNET";
    else if (fNetwork === "PUBLIC" || fNetwork === "MAINNET") network = "MAINNET";
  } catch {
    network = "TESTNET";
  }

  persistWallet({ publicKey, walletId, walletName, connectedAt: Date.now() });
  return { publicKey, network, walletId, walletName };
}

async function connectXBull(
  walletId: string,
  walletName: string
): Promise<{
  publicKey: string;
  network: NetworkType;
  walletId: string;
  walletName: string;
}> {
  // xBull injects xBullSDK as a global
  const xbull = (window as unknown as Record<string, Record<string, unknown>>).xBullSDK;
  if (!xbull || !xbull.connect) {
    throw new Error("XBULL_NOT_DETECTED");
  }
  try {
    const pubkey = await (xbull.connect as () => Promise<string>)();
    if (!pubkey || typeof pubkey !== "string") {
      throw new Error("NO_ACCOUNT");
    }
    persistWallet({ publicKey: pubkey, walletId, walletName, connectedAt: Date.now() });
    return { publicKey: pubkey, network: "TESTNET", walletId, walletName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("reject") || msg.includes("denied")) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("XBULL_CONNECTION_FAILED");
  }
}

async function connectAlbedo(
  walletId: string,
  walletName: string
): Promise<{
  publicKey: string;
  network: NetworkType;
  walletId: string;
  walletName: string;
}> {
  // Albedo is web-based — opens a popup for auth
  try {
    const albedo = await import("@albedo-link/intent");
    const result = await albedo.default.publicKey({});
    if (!result.pubkey) {
      throw new Error("NO_ACCOUNT");
    }
    persistWallet({
      publicKey: result.pubkey,
      walletId,
      walletName,
      connectedAt: Date.now(),
    });
    return {
      publicKey: result.pubkey,
      network: "TESTNET",
      walletId,
      walletName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("reject") || msg.includes("denied") || msg.includes("closed")) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("ALBEDO_CONNECTION_FAILED");
  }
}

// ---- Transaction Signing ----

/**
 * Sign a transaction XDR using the currently connected wallet.
 */
export async function signTx(
  xdr: string,
  publicKey: string
): Promise<string> {
  const persisted = loadPersistedWallet();
  const walletId = persisted?.walletId || "freighter";

  switch (walletId) {
    case "freighter": {
      const { signTransaction } = await import("@stellar/freighter-api");
      const { signedTxXdr } = await signTransaction(xdr, {
        networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      });
      return signedTxXdr;
    }
    case "xbull": {
      const xbull = (window as unknown as Record<string, Record<string, unknown>>).xBullSDK;
      if (!xbull || !xbull.sign) {
        throw new Error("xBull signing not available");
      }
      const signed = await (xbull.sign as (xdr: string, opts: Record<string, unknown>) => Promise<{ signedXdr: string }>)(xdr, {
        networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      });
      return signed.signedXdr;
    }
    case "albedo": {
      const albedo = await import("@albedo-link/intent");
      const result = await albedo.default.tx({
        xdr,
        network: "testnet",
      });
      return result.signed_envelope_xdr;
    }
    default:
      throw new Error(`Signing not supported for wallet: ${walletId}`);
  }
}

// ---- Network Detection ----

export async function detectNetwork(): Promise<NetworkType> {
  try {
    const { getNetwork } = await import("@stellar/freighter-api");
    const { network } = await getNetwork();
    if (network === "TESTNET") return "TESTNET";
    if (network === "PUBLIC" || network === "MAINNET") return "MAINNET";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}
