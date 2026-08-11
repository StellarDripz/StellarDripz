/**
 * POST /api/contract/invoke — Build or submit Soroban contract invocation
 * Body: { contractId, functionName, args, signerAddress, signedXdr? }
 *
 * Supports these ScVal arg types:
 *   - string    → scvString
 *   - number    → scvU32 (if integer) / scvI128 (if large)
 *   - { address: "G..." } → scvAddress
 *   - { i128: 123 } → scvI128
 *   - { u64: 123 }  → scvU64
 *   - { symbol: "X" } → scvSymbol
 *   - { vec: [...] } → scvVec
 *   - { map: [...] } → scvMap
 */
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rateLimiter";
import { validateCsrf, setCsrfCookie } from "@/lib/server/csrf";
import {
  simulateContractCallServer,
  buildContractInvocation,
  submitContractInvocation,
} from "@/lib/server/sorobanService";
import * as StellarSdk from "@stellar/stellar-sdk";

/** Convert a JSON argument to Soroban ScVal */
function argToScVal(arg: unknown): StellarSdk.xdr.ScVal {
  // null / undefined
  if (arg === null || arg === undefined) {
    return StellarSdk.xdr.ScVal.scvVoid();
  }

  // string
  if (typeof arg === "string") {
    // Detect Stellar address format
    if (/^G[A-Z2-7]{55}$/.test(arg)) {
      const addr = new StellarSdk.Address(arg);
      return StellarSdk.xdr.ScVal.scvAddress(addr.toScAddress());
    }
    // Short symbol-like strings → Symbol, longer → String
    if (arg.length <= 10 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg)) {
      return StellarSdk.xdr.ScVal.scvSymbol(arg);
    }
    // Numeric strings → i128
    if (/^-?\d+$/.test(arg)) {
      const num = BigInt(arg);
      const lo = Number(num & BigInt("0xFFFFFFFFFFFFFFFF"));
      const hi = Number(num >> BigInt(64));
      return StellarSdk.xdr.ScVal.scvI128(
        new StellarSdk.xdr.Int128Parts({
          lo: new StellarSdk.xdr.Uint64(lo),
          hi: new StellarSdk.xdr.Int64(hi),
        }),
      );
    }
    return StellarSdk.xdr.ScVal.scvString(arg);
  }

  // number
  if (typeof arg === "number") {
    if (Number.isInteger(arg) && arg >= 0 && arg <= 4294967295) {
      return StellarSdk.xdr.ScVal.scvU32(arg);
    }
    return StellarSdk.xdr.ScVal.scvString(String(arg));
  }

  // boolean
  if (typeof arg === "boolean") {
    return StellarSdk.xdr.ScVal.scvBool(arg);
  }

  // object with type hints
  if (typeof arg === "object" && arg !== null) {
    const obj = arg as Record<string, unknown>;

    if (obj.address && typeof obj.address === "string") {
      const addr = new StellarSdk.Address(obj.address);
      return StellarSdk.xdr.ScVal.scvAddress(addr.toScAddress());
    }
    if (obj.i128 !== undefined) {
      const num = BigInt(String(obj.i128));
      const lo = Number(num & BigInt("0xFFFFFFFFFFFFFFFF"));
      const hi = Number(num >> BigInt(64));
      return StellarSdk.xdr.ScVal.scvI128(
        new StellarSdk.xdr.Int128Parts({
          lo: new StellarSdk.xdr.Uint64(lo),
          hi: new StellarSdk.xdr.Int64(hi),
        }),
      );
    }
    if (obj.u64 !== undefined) {
      return StellarSdk.xdr.ScVal.scvU64(
        StellarSdk.xdr.Uint64.fromString(String(obj.u64)),
      );
    }
    if (obj.symbol && typeof obj.symbol === "string") {
      return StellarSdk.xdr.ScVal.scvSymbol(obj.symbol);
    }
    if (obj.vec && Array.isArray(obj.vec)) {
      const items = obj.vec.map((item: unknown) => argToScVal(item));
      return StellarSdk.xdr.ScVal.scvVec(items);
    }
    if (obj.map && Array.isArray(obj.map)) {
      const entries = obj.map.map(([key, val]: [unknown, unknown]) => {
        const scvKey = argToScVal(key);
        const scvVal = argToScVal(val);
        return new StellarSdk.xdr.ScMapEntry({
          key: scvKey,
          val: scvVal,
        });
      });
      return StellarSdk.xdr.ScVal.scvMap(entries);
    }
    if (obj.bool !== undefined) {
      return StellarSdk.xdr.ScVal.scvBool(Boolean(obj.bool));
    }
  }

  // Fallback: treat as string
  return StellarSdk.xdr.ScVal.scvString(String(arg));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      contractId?: string;
      functionName?: string;
      args?: unknown[];
      signerAddress?: string;
      signedXdr?: string;
      simulate?: boolean;
    };

    if (!body.contractId || !body.functionName || !body.signerAddress) {
      return NextResponse.json(
        { error: "contractId, functionName, signerAddress required" },
        { status: 400 },
      );
    }

    // Convert args to ScVal with comprehensive type support
    const scValArgs: StellarSdk.xdr.ScVal[] = (body.args || []).map(argToScVal);

    // Read-only simulation
    if (body.simulate) {
      const result = await simulateContractCallServer(
        body.contractId,
        body.functionName,
        scValArgs,
        body.signerAddress,
      );
      return NextResponse.json({ resultValue: result.resultValue });
    }

    // Submit signed invocation (state-changing — requires CSRF)
    if (body.signedXdr) {
      const csrfError = validateCsrf(request);
      if (csrfError) return csrfError;

      const rateLimitResponse = checkRateLimit(request, "contract", body.signerAddress);
      if (rateLimitResponse) return rateLimitResponse;

      const ip = request.headers.get("x-forwarded-for") || undefined;
      const ua = request.headers.get("user-agent") || undefined;

      const result = await submitContractInvocation(
        body.signedXdr,
        body.contractId,
        body.functionName,
        body.signerAddress,
        { ip, userAgent: ua },
      );
      const response = NextResponse.json({
        success: true,
        hash: result.hash,
        resultValue: result.resultValue,
      });
      setCsrfCookie(response);
      return response;
    }

    // Build transaction for signing
    const { xdr } = await buildContractInvocation(
      body.contractId,
      body.functionName,
      scValArgs,
      body.signerAddress,
    );
    return NextResponse.json({ xdr });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Contract invocation failed" },
      { status: 500 },
    );
  }
}
