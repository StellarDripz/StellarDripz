/**
 * Environment validation & configuration.
 * Validates required env vars at startup and provides typed config access.
 */

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  isTestnet: boolean;
  sorobanRpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  friendbotUrl: string;
  stellarExpertUrl: string;
  contractIdCounter: string | null;
  contractIdDripToken: string | null;
  contractIdDripPool: string | null;
  contractIdGovernance: string | null;
  contractIdBadge: string | null;
  rateLimitFaucet: number;
  rateLimitContract: number;
  rateLimitGeneral: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

function required(name: string, value: string | undefined, fallback?: string): string {
  if (value && value.trim()) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function optional(name: string, value: string | undefined): string | null {
  return value?.trim() || null;
}

let _config: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (_config) return _config;

  const nodeEnv = (process.env.NODE_ENV || "development") as AppConfig["nodeEnv"];

  const isTestnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK !== "mainnet";

  _config = {
    nodeEnv,
    isTestnet,

    sorobanRpcUrl: required(
      "NEXT_PUBLIC_SOROBAN_RPC_URL",
      process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
      "https://soroban-testnet.stellar.org",
    ),
    horizonUrl: required(
      "NEXT_PUBLIC_HORIZON_URL",
      process.env.NEXT_PUBLIC_HORIZON_URL,
      "https://horizon-testnet.stellar.org",
    ),
    networkPassphrase: required(
      "NEXT_PUBLIC_NETWORK_PASSPHRASE",
      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
      "Test SDF Network ; September 2015",
    ),
    friendbotUrl: required(
      "NEXT_PUBLIC_FRIENDBOT_URL",
      process.env.NEXT_PUBLIC_FRIENDBOT_URL,
      "https://friendbot.stellar.org",
    ),
    stellarExpertUrl: required(
      "NEXT_PUBLIC_STELLAR_EXPERT_URL",
      process.env.NEXT_PUBLIC_STELLAR_EXPERT_URL,
      "https://stellar.expert/explorer/testnet",
    ),

    contractIdCounter: optional(
      "NEXT_PUBLIC_CONTRACT_COUNTER",
      process.env.NEXT_PUBLIC_CONTRACT_COUNTER,
    ),
    contractIdDripToken: optional(
      "NEXT_PUBLIC_CONTRACT_DRIP_TOKEN",
      process.env.NEXT_PUBLIC_CONTRACT_DRIP_TOKEN,
    ),
    contractIdDripPool: optional(
      "NEXT_PUBLIC_CONTRACT_DRIP_POOL",
      process.env.NEXT_PUBLIC_CONTRACT_DRIP_POOL,
    ),
    contractIdGovernance: optional(
      "NEXT_PUBLIC_CONTRACT_GOVERNANCE",
      process.env.NEXT_PUBLIC_CONTRACT_GOVERNANCE,
    ),
    contractIdBadge: optional("NEXT_PUBLIC_CONTRACT_BADGE", process.env.NEXT_PUBLIC_CONTRACT_BADGE),

    rateLimitFaucet: parseInt(process.env.RATE_LIMIT_FAUCET_MS || "60000", 10),
    rateLimitContract: parseInt(process.env.RATE_LIMIT_CONTRACT_MS || "30000", 10),
    rateLimitGeneral: parseInt(process.env.RATE_LIMIT_GENERAL_MS || "10000", 10),

    logLevel: (process.env.LOG_LEVEL ||
      (nodeEnv === "production" ? "info" : "debug")) as AppConfig["logLevel"],
  };

  // Log config on startup (server-side only)
  if (typeof window === "undefined") {
    console.log("[StellarDripz] Config loaded:", {
      nodeEnv: _config.nodeEnv,
      isTestnet: _config.isTestnet,
      logLevel: _config.logLevel,
      contracts: {
        counter: _config.contractIdCounter ? "✓" : "not set",
        dripToken: _config.contractIdDripToken ? "✓" : "not set",
        dripPool: _config.contractIdDripPool ? "✓" : "not set",
        governance: _config.contractIdGovernance ? "✓" : "not set",
        badge: _config.contractIdBadge ? "✓" : "not set",
      },
    });
  }

  return _config;
}

/** Validate critical env vars — call at startup */
export function validateEnv(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const config = getAppConfig();
    if (config.nodeEnv === "production" && config.isTestnet) {
      warnings.push("Running in production mode on Testnet — is this intentional?");
    }
    if (!config.contractIdCounter && !config.contractIdDripToken && !config.contractIdDripPool) {
      warnings.push("No contract IDs configured — smart contract features will be limited");
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Config validation failed");
  }

  return { valid: errors.length === 0, warnings, errors };
}
// Config singleton pattern — cached after first call for performance
