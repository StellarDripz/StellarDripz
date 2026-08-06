import * as StellarSdk from "@stellar/stellar-sdk";
import { signTx } from "./walletService";
import { STELLAR_CONFIG } from "@/config";
import { fetchBalance } from "./balanceService";
import type { StellarAsset } from "@/types";

const server = new StellarSdk.Horizon.Server(STELLAR_CONFIG.horizonUrl);

/**
 * Request testnet XLM from Friendbot for the given public key.
 * Returns the transaction hash on success.
 */
export async function requestFaucetFunds(
  publicKey: string
): Promise<{ hash: string; newBalance: string }> {
  const url = `${
    STELLAR_CONFIG.friendbotUrl
  }?addr=${encodeURIComponent(publicKey)}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Friendbot returns { detail: "..." } or { title: "..." } sometimes
    const detail =
      body?.detail || body?.title || `HTTP ${res.status}: ${res.statusText}`;

    if (typeof detail === "string") {
      if (detail.toLowerCase().includes("already funded")) {
        throw new Error("Account already funded — no funds needed!");
      }
      if (detail.toLowerCase().includes("rate limit")) {
        throw new Error("Rate limited — try again in a few seconds.");
      }
    }
    throw new Error(`Friendbot error: ${detail}`);
  }

  const data = await res.json();
  const hash =
    data?.transaction_hash ||
    data?.hash ||
    data?.id ||
    `faucet-${Date.now()}`;

  // Fetch updated balance
  const balance = await fetchBalance(publicKey);

  return { hash, newBalance: balance.xlm };
}

function toStellarAsset(asset: StellarAsset): StellarSdk.Asset {
  if (asset.type === "native") {
    return StellarSdk.Asset.native();
  }
  return new StellarSdk.Asset(asset.code, asset.issuer);
}

/**
 * Build, sign (via Freighter), and submit a payment transaction.
 * Supports native XLM and custom Stellar assets.
 * Returns the transaction hash on success.
 */
export async function sendPayment(
  senderPublicKey: string,
  destination: string,
  amount: string,
  asset?: StellarAsset
): Promise<{ hash: string }> {
  // Validate network passphrase
  if (
    STELLAR_CONFIG.networkPassphrase !== StellarSdk.Networks.TESTNET
  ) {
    throw new Error("Network mismatch — expected Testnet.");
  }

  // Load the sender's account from Horizon
  const sourceAccount = await server.loadAccount(senderPublicKey);

  const stellarAsset = asset ? toStellarAsset(asset) : StellarSdk.Asset.native();

  // Build the transaction
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: stellarAsset,
        amount,
      })
    )
    .setTimeout(30)
    .build();

  // Get the XDR to sign
  const xdr = transaction.toXDR();

  // Sign via Freighter
  const signedXdr = await signTx(xdr);

  // Create a transaction from the signed XDR
  const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_CONFIG.networkPassphrase
  );

  // Submit to the network
  const response = await server.submitTransaction(signedTransaction);

  return { hash: response.hash };
}

/**
 * Build the explorer URL for a transaction hash.
 */
export function getExplorerUrl(hash: string): string {
  return `${STELLAR_CONFIG.stellarExpertUrl}/tx/${hash}`;
}
