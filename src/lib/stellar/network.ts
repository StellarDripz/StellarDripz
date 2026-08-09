/**
 * Stellar network configuration — single source of truth.
 * All values are derived from the shared AppConfig (env.ts).
 * Import this module instead of reading process.env directly.
 */
import { getAppConfig } from "@/lib/env";

function buildNetworkConfig() {
  const config = getAppConfig();

  return {
    network: (config.isTestnet ? "TESTNET" : "MAINNET") as "TESTNET" | "MAINNET",
    horizonUrl: config.horizonUrl,
    friendbotUrl: config.friendbotUrl,
    stellarExpertUrl: config.stellarExpertUrl,
    networkPassphrase: config.networkPassphrase,
    sorobanRpcUrl: config.sorobanRpcUrl,
    contractExplorerUrl:
      process.env.NEXT_PUBLIC_CONTRACT_EXPLORER_URL ||
      "https://stellar.expert/explorer/testnet/contract",
  } as const;
}

export const STELLAR_NETWORK = buildNetworkConfig();

/** Re-export for convenience — prefer importing STELLAR_NETWORK directly. */
export { getAppConfig } from "@/lib/env";
