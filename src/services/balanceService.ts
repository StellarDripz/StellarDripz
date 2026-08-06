import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config";
import type { BalanceInfo } from "@/types";

const server = new StellarSdk.Horizon.Server(STELLAR_CONFIG.horizonUrl);

/**
 * Fetch the XLM balance for a given Stellar public key.
 * Returns the formatted balance string or throws.
 */
export async function fetchBalance(
  publicKey: string
): Promise<BalanceInfo> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(
      (b) => b.asset_type === "native"
    );

    if (!xlmBalance) {
      return { xlm: "0.0000000", raw: "0", lastFetched: new Date() };
    }

    const raw = xlmBalance.balance;
    // Format to 7 decimal places (Stellar standard)
    const formatted = parseFloat(raw).toLocaleString("en-US", {
      minimumFractionDigits: 7,
      maximumFractionDigits: 7,
    });

    return { xlm: formatted, raw, lastFetched: new Date() };
  } catch (err: unknown) {
    // NotFoundError means the account hasn't been funded yet
    if (err instanceof StellarSdk.NotFoundError) {
      return { xlm: "0.0000000", raw: "0", lastFetched: new Date() };
    }
    throw err;
  }
}
