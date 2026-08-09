/**
 * Network health check endpoint.
 * GET /api/status
 */
import { NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/lib/stellar/network";

export async function GET() {
  const results: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {};

  // Check Horizon
  try {
    const start = Date.now();
    const horizon = new StellarSdk.Horizon.Server(STELLAR_NETWORK.horizonUrl);
    await horizon.ledgers().limit(1).call();
    results.horizon = { status: "ok", latency: Date.now() - start };
  } catch (err) {
    results.horizon = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check Soroban RPC
  try {
    const start = Date.now();
    const rpc = new StellarSdk.rpc.Server(STELLAR_NETWORK.sorobanRpcUrl);
    await rpc.getLatestLedger();
    results.sorobanRpc = { status: "ok", latency: Date.now() - start };
  } catch (err) {
    results.sorobanRpc = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check Friendbot
  try {
    const start = Date.now();
    const url = `${STELLAR_NETWORK.friendbotUrl}?addr=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const res = await fetch(url);
    results.friendbot = { status: res.ok ? "ok" : "error", latency: Date.now() - start };
  } catch (err) {
    results.friendbot = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    network: STELLAR_NETWORK.network,
    services: results,
  });
}
