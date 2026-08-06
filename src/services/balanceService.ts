import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config";
import type { BalanceInfo, AssetBalance, StellarAsset } from "@/types";

const server = new StellarSdk.Horizon.Server(STELLAR_CONFIG.horizonUrl);

/**
 * Parse a Horizon balance line into our AssetBalance type.
 */
function parseBalance(b: {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}): AssetBalance {
  const raw = b.balance;

  if (b.asset_type === "native") {
    return {
      asset: { code: "XLM", issuer: "", type: "native" },
      balance: raw,
      formatted: parseFloat(raw).toLocaleString("en-US", {
        minimumFractionDigits: 7,
        maximumFractionDigits: 7,
      }),
    };
  }

  // Custom asset (alphanum4 or alphanum12)
  const asset: StellarAsset = {
    code: b.asset_code || "???",
    issuer: b.asset_issuer || "",
    type: b.asset_type as "credit_alphanum4" | "credit_alphanum12",
  };

  const decimals = asset.type === "credit_alphanum4" ? 7 : 12;
  return {
    asset,
    balance: raw,
    formatted: parseFloat(raw).toLocaleString("en-US", {
      minimumFractionDigits: Math.min(decimals, 7),
      maximumFractionDigits: Math.min(decimals, 7),
    }),
  };
}

/**
 * Fetch all asset balances for a given Stellar public key.
 * Returns XLM balance plus all custom asset balances.
 */
export async function fetchBalance(
  publicKey: string
): Promise<BalanceInfo> {
  try {
    const account = await server.loadAccount(publicKey);

    const assets: AssetBalance[] = account.balances.map(parseBalance);

    const xlmAsset = assets.find((a) => a.asset.type === "native");
    const xlm = xlmAsset?.formatted || "0.0000000";
    const raw = xlmAsset?.balance || "0";

    return { xlm, raw, assets, lastFetched: new Date() };
  } catch (err: unknown) {
    // NotFoundError means the account hasn't been funded yet
    if (err instanceof StellarSdk.NotFoundError) {
      return {
        xlm: "0.0000000",
        raw: "0",
        assets: [],
        lastFetched: new Date(),
      };
    }
    throw err;
  }
}
