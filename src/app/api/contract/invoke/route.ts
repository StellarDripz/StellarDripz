/**
 * POST /api/contract/invoke — Build or submit Soroban contract invocation
 * Body: { contractId, functionName, args, signerAddress, signedXdr? }
 */
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rateLimiter";
import {
  simulateContractCallServer,
  buildContractInvocation,
  submitContractInvocation,
} from "@/lib/server/sorobanService";
import * as StellarSdk from "@stellar/stellar-sdk";

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

    // Convert args to ScVal
    const scValArgs: StellarSdk.xdr.ScVal[] = (body.args || []).map((arg: unknown) => {
      if (typeof arg === "string") return StellarSdk.xdr.ScVal.scvString(arg);
      if (typeof arg === "number") return StellarSdk.xdr.ScVal.scvU32(arg as number);
      return arg as StellarSdk.xdr.ScVal;
    });

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

    // Submit signed invocation
    if (body.signedXdr) {
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
      return NextResponse.json({
        success: true,
        hash: result.hash,
        resultValue: result.resultValue,
      });
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
// Simulate (read-only) and invoke (write) contract operations
