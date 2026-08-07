/**
 * Horizon service layer — wraps Stellar Horizon API for balance, payments, faucet.
 * All requests are validated server-side before hitting Horizon.
 */
import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/lib/stellar/network";
import type { TxRecord } from "./dbService";
import { saveTransaction, logAnalytics } from "./dbService";

const horizonServer = new StellarSdk.Horizon.Server(STELLAR_NETWORK.horizonUrl);

// ---- Balance ----

export interface BalanceResponse {
  xlm: string;
  raw: string;
  assets: Array<{
    code: string;
    issuer: string;
    type: string;
    balance: string;
    formatted: string;
  }>;
  lastFetched: string;
}

export async function fetchBalanceServer(publicKey: string): Promise<BalanceResponse> {
  logAnalytics({ eventType: "balance_fetch", address: publicKey });

  try {
    const account = await horizonServer.loadAccount(publicKey);
    const assets = account.balances
      .filter((b) => b.asset_type !== "liquidity_pool_shares")
      .map((b) => {
        const raw = b.balance;
        if (b.asset_type === "native") {
          return {
            code: "XLM",
            issuer: "",
            type: "native",
            balance: raw,
            formatted: parseFloat(raw).toLocaleString("en-US", {
              minimumFractionDigits: 7,
              maximumFractionDigits: 7,
            }),
          };
        }
        return {
          code: b.asset_code || "???",
          issuer: b.asset_issuer || "",
          type: b.asset_type,
          balance: raw,
          formatted: parseFloat(raw).toLocaleString("en-US", {
            minimumFractionDigits: 7,
            maximumFractionDigits: 7,
          }),
        };
      });

    const xlmAsset = assets.find((a) => a.type === "native");
    return {
      xlm: xlmAsset?.formatted || "0.0000000",
      raw: xlmAsset?.balance || "0",
      assets,
      lastFetched: new Date().toISOString(),
    };
  } catch (err: unknown) {
    if (err instanceof StellarSdk.NotFoundError) {
      return { xlm: "0.0000000", raw: "0", assets: [], lastFetched: new Date().toISOString() };
    }
    throw err;
  }
}

// ---- Faucet ----

export async function requestFaucetFundsServer(
  publicKey: string,
  requestInfo: { ip?: string; userAgent?: string },
): Promise<{ hash: string; newBalance: string }> {
  const url = `${STELLAR_NETWORK.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(typeof detail === "string" ? detail : "Friendbot error");
  }

  const data = await res.json();
  const hash = data?.hash || data?.transaction_hash || data?.id || `faucet-${Date.now()}`;
  const balance = await fetchBalanceServer(publicKey);

  // Log to database
  const txRecord: TxRecord = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: "faucet",
    status: "success",
    hash,
    amount: "10000",
    assetCode: "XLM",
    senderAddress: "friendbot",
    destinationAddress: publicKey,
    timestamp: Date.now(),
    ip: requestInfo.ip,
    userAgent: requestInfo.userAgent,
  };
  saveTransaction(txRecord);
  logAnalytics({
    eventType: "faucet_request",
    address: publicKey,
    data: { hash, amount: "10000" },
  });

  return { hash, newBalance: balance.xlm };
}

// ---- Payment ----

export async function sendPaymentServer(
  senderPublicKey: string,
  signedXdr: string,
  destination: string,
  amount: string,
  assetCode: string,
  requestInfo: { ip?: string; userAgent?: string },
): Promise<{ hash: string }> {
  if (STELLAR_NETWORK.networkPassphrase !== StellarSdk.Networks.TESTNET) {
    throw new Error("Network mismatch — expected Testnet.");
  }

  // Validate destination
  try {
    StellarSdk.StrKey.decodeEd25519PublicKey(destination);
  } catch {
    throw new Error("Invalid destination address.");
  }

  // Submit the signed transaction
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_NETWORK.networkPassphrase,
  );
  const response = await horizonServer.submitTransaction(signedTx);

  // Log
  const txRecord: TxRecord = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: "send",
    status: "success",
    hash: response.hash,
    amount,
    assetCode,
    senderAddress: senderPublicKey,
    destinationAddress: destination,
    timestamp: Date.now(),
    ip: requestInfo.ip,
    userAgent: requestInfo.userAgent,
  };
  saveTransaction(txRecord);
  logAnalytics({
    eventType: "payment_send",
    address: senderPublicKey,
    data: { hash: response.hash, amount, destination },
  });

  return { hash: response.hash };
}

// ---- Build Transaction (returns XDR for frontend to sign) ----

export async function buildPaymentTransaction(
  senderPublicKey: string,
  destination: string,
  amount: string,
  assetCode?: string,
): Promise<{ xdr: string }> {
  try {
    StellarSdk.StrKey.decodeEd25519PublicKey(destination);
  } catch {
    throw new Error("Invalid destination address.");
  }

  const sourceAccount = await horizonServer.loadAccount(senderPublicKey);
  const feeStats = await horizonServer.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));

  const asset =
    !assetCode || assetCode === "XLM"
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(assetCode, senderPublicKey);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.payment({ destination, asset, amount }))
    .setTimeout(30)
    .build();

  return { xdr: tx.toXDR() };
}
// Horizon balance parsing handles native, credit_alphanum4, and credit_alphanum12
