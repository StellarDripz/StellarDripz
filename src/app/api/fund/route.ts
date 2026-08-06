/**
 * Rate-limited faucet funding endpoint.
 * POST /api/fund
 * Body: { address: string }
 */
import { NextRequest, NextResponse } from "next/server";

const FRIENDBOT_URL = process.env.NEXT_PUBLIC_FRIENDBOT_URL || "https://friendbot.stellar.org";

// In-memory cooldown map (server-side rate limiting)
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 1 minute per address

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { address?: string };
    const address = body?.address?.trim();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Validate Stellar address format (starts with G, 56 chars)
    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      return NextResponse.json({ error: "Invalid Stellar address format" }, { status: 400 });
    }

    // Rate limiting
    const lastRequest = cooldowns.get(address);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Rate limited. Try again in ${remaining} seconds.`, retryAfter: remaining },
          { status: 429 }
        );
      }
    }

    // Forward to Friendbot
    const url = `${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data?.detail || data?.title || `HTTP ${res.status}`;
      return NextResponse.json({ error: String(detail) }, { status: res.status });
    }

    // Record cooldown
    cooldowns.set(address, Date.now());

    const data = await res.json();
    return NextResponse.json({
      success: true,
      hash: data?.hash || data?.transaction_hash || data?.id || null,
      message: "10,000 test XLM sent!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
