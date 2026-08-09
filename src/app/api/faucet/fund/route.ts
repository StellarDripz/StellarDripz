/**
 * POST /api/faucet/fund — Rate-limited Friendbot funding
 * Body: { address: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rateLimiter";
import { requestFaucetFundsServer } from "@/lib/server/horizonService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { address?: string };
    const address = body?.address?.trim();

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    // Per-address rate limiting (1 per 60s)
    const rateLimitResponse = checkRateLimit(request, "faucet", address);
    if (rateLimitResponse) return rateLimitResponse;

    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || undefined;
    const ua = request.headers.get("user-agent") || undefined;

    const result = await requestFaucetFundsServer(address, { ip, userAgent: ua });

    return NextResponse.json({
      success: true,
      hash: result.hash,
      newBalance: result.newBalance,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Faucet request failed" },
      { status: 500 },
    );
  }
}
