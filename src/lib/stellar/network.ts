/**
 * Stellar Testnet configuration and network constants.
 * All values can be overridden via environment variables.
 */
export const STELLAR_NETWORK = {
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET") as
    | "TESTNET"
    | "MAINNET",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
  friendbotUrl:
    process.env.NEXT_PUBLIC_FRIENDBOT_URL || "https://friendbot.stellar.org",
  stellarExpertUrl:
    process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL ||
    "https://stellar.expert/explorer/testnet",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  sorobanRpcUrl:
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    "https://soroban-testnet.stellar.org",
  contractExplorerUrl:
    process.env.NEXT_PUBLIC_CONTRACT_EXPLORER_URL ||
    "https://stellar.expert/explorer/testnet/contract",
} as const;
