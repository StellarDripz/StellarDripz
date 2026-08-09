/**
 * Batch funding endpoint.
 * POST /api/batch
 * Body: { addresses: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { STELLAR_NETWORK } from "@/lib/stellar/network";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { addresses?: string[] };
    const addresses = body?.addresses;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: "addresses array is required" }, { status: 400 });
    }

    if (addresses.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 addresses per batch request" },
        { status: 400 },
      );
    }

    // Validate all addresses
    for (const addr of addresses) {
      if (typeof addr !== "string" || !/^G[A-Z2-7]{55}$/.test(addr.trim())) {
        return NextResponse.json({ error: `Invalid address: ${addr}` }, { status: 400 });
      }
    }

    // Fund each address sequentially (Friendbot doesn't support batch)
    const results: {
      address: string;
      status: "success" | "error";
      hash?: string;
      error?: string;
    }[] = [];

    for (const address of addresses) {
      try {
        const url = `${STELLAR_NETWORK.friendbotUrl}?addr=${encodeURIComponent(address.trim())}`;
        const res = await fetch(url);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          results.push({
            address: address.trim(),
            status: "error",
            error: data?.detail || data?.title || `HTTP ${res.status}`,
          });
        } else {
          const data = await res.json();
          results.push({
            address: address.trim(),
            status: "success",
            hash: data?.hash || data?.transaction_hash || null,
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        results.push({
          address: address.trim(),
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      total: results.length,
      succeeded,
      failed,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
