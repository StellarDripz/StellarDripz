/**
 * Freighter wallet connector.
 * Detects, connects, signs, and detects network via @stellar/freighter-api.
 */
import { STELLAR_NETWORK } from "../stellar/network";
import { persistWallet } from "./walletKit";
import type { NetworkType } from "@/types";

export function isFreighterInstalled(): boolean {
  return typeof window !== "undefined" && "freighterApi" in window;
}

export async function connectFreighter(
  walletId: string,
  walletName: string
): Promise<{
  publicKey: string;
  network: NetworkType;
  walletId: string;
  walletName: string;
}> {
  const { isConnected, requestAccess, getNetwork } = await import("@stellar/freighter-api");

  const { isConnected: connected } = await isConnected();
  if (!connected) throw new Error("FREIGHTER_LOCKED");

  let publicKey: string;
  try {
    const { address } = await requestAccess();
    publicKey = address;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("reject") || msg.includes("denied")) throw new Error("USER_REJECTED");
    throw new Error("CONNECTION_FAILED");
  }

  if (!publicKey) throw new Error("NO_ACCOUNT");

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

export async function signFreighter(xdr: string): Promise<string> {
  const { signTransaction } = await import("@stellar/freighter-api");
  const { signedTxXdr } = await signTransaction(xdr, {
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  });
  return signedTxXdr;
}

export async function detectFreighterNetwork(): Promise<NetworkType> {
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
