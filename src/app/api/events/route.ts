/**
 * GET /api/events — SSE endpoint for real-time contract events.
 * Keeps the connection open and streams contract events as they occur.
 *
 * Query params:
 *   - contractId: Filter by contract ID (required)
 *   - pollInterval: Polling interval in ms (default 5000)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getContractEventsServer,
  getLatestLedgerServer,
} from "@/lib/server/sorobanService";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel function timeout: Hobby ~10s (60s max), Pro up to 300s for streaming.
// Set to the platform maximum so SSE streams live as long as the plan allows.
export const maxDuration = 300;

async function* streamEvents(contractId: string, pollMs: number) {
  // Start near the head of the chain instead of ledger 0 (fast cold starts).
  let startLedger = 0;
  try {
    const latest = await getLatestLedgerServer();
    startLedger = Math.max(0, latest - 100);
  } catch {
    startLedger = 0;
  }

  while (true) {
    try {
      const result = await getContractEventsServer(contractId, startLedger);

      if (result.events.length > 0) {
        for (const event of result.events) {
          yield `data: ${JSON.stringify({ ...event, contractId, timestamp: Date.now() })}\n\n`;
        }
      }

      // Send a heartbeat to keep connection alive
      yield `: heartbeat ${Date.now()}\n\n`;

      startLedger = result.latestLedger || startLedger;
    } catch (err) {
      logger.error("SSE event stream error", err instanceof Error ? err : new Error(String(err)));
      yield `event: error\ndata: ${JSON.stringify({ error: "Stream error, reconnecting..." })}\n\n`;
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get("contractId");
  const pollInterval = Math.max(1000, parseInt(searchParams.get("pollInterval") || "5000", 10));

  if (!contractId) {
    return NextResponse.json({ error: "contractId query parameter required" }, { status: 400 });
  }

  logger.info("SSE stream started", { contractId, pollInterval });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const eventStream = streamEvents(contractId, pollInterval);

      for await (const chunk of eventStream) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client disconnected
          break;
        }
      }
    },
    cancel() {
      logger.info("SSE stream cancelled", { contractId });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
