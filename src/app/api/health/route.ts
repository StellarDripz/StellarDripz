/**
 * GET /api/health — Health check endpoint for monitoring & deployment verification.
 * Returns service status, uptime, and environment info.
 */

import { NextResponse } from "next/server";
import { validateEnv, getAppConfig } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getDatabaseBackend } from "@/lib/server/dbService";

const startTime = Date.now();

let cachedStatus: {
  horizonOk: boolean;
  sorobanOk: boolean;
  lastCheck: number;
} | null = null;
const CACHE_TTL = 30_000; // 30 seconds

async function checkServices(): Promise<{ horizonOk: boolean; sorobanOk: boolean }> {
  if (cachedStatus && Date.now() - cachedStatus.lastCheck < CACHE_TTL) {
    return { horizonOk: cachedStatus.horizonOk, sorobanOk: cachedStatus.sorobanOk };
  }

  const config = getAppConfig();

  // Check Horizon
  let horizonOk = false;
  try {
    const res = await fetch(config.horizonUrl, { signal: AbortSignal.timeout(5000) });
    horizonOk = res.ok;
  } catch {
    horizonOk = false;
  }

  // Check Soroban RPC
  let sorobanOk = false;
  try {
    const res = await fetch(config.sorobanRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    sorobanOk = json?.result?.status === "healthy";
  } catch {
    sorobanOk = false;
  }

  cachedStatus = { horizonOk, sorobanOk, lastCheck: Date.now() };
  return { horizonOk, sorobanOk };
}

export async function GET() {
  const config = getAppConfig();
  const env = validateEnv();
  const services = await checkServices();

  const allOk = services.horizonOk && services.sorobanOk;

  logger.info("Health check", {
    allOk,
    horizon: services.horizonOk,
    soroban: services.sorobanOk,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: config.nodeEnv,
      network: config.isTestnet ? "testnet" : "mainnet",
      services: {
        horizon: services.horizonOk ? "ok" : "error",
        sorobanRpc: services.sorobanOk ? "ok" : "error",
      },
      contracts: {
        counter: config.contractIdCounter ? "configured" : "not set",
        dripToken: config.contractIdDripToken ? "configured" : "not set",
        dripPool: config.contractIdDripPool ? "configured" : "not set",
        governance: config.contractIdGovernance ? "configured" : "not set",
        badge: config.contractIdBadge ? "configured" : "not set",
      },
      database: {
        backend: getDatabaseBackend(),
      },
      warnings: env.warnings,
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "X-Health-Check": "stellar-dripz",
      },
    },
  );
}
