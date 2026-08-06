export const STELLAR_CONFIG = {
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
} as const;
