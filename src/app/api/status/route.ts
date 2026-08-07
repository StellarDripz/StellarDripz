/**
 * Network health check endpoint.
 * GET /api/status
 */
import { NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

export async function GET() {
  const results: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {};

  // Check Horizon
  try {
    const start = Date.now();
    const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
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
    const rpc = new StellarSdk.rpc.Server(SOROBAN_RPC);
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
    const url = `${process.env.NEXT_PUBLIC_FRIENDBOT_URL || "https://friendbot.stellar.org"}?addr=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
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
    network: "TESTNET",
    services: results,
  });
}
