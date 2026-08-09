/**
 * GET /api/analytics — Analytics data from database
 * Query: ?type=faucet_request|payment_send|contract_invoke|wallet_connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAnalytics, getAnalyticsSummary, type AnalyticsEntry } from "@/lib/server/dbService";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const eventType = url.searchParams.get("type") as AnalyticsEntry["eventType"] | null;
  const summary = url.searchParams.get("summary") === "true";

  if (summary) {
    const data = await getAnalyticsSummary();
    return NextResponse.json({ summary: data });
  }

  const entries = await getAnalytics(eventType || undefined);
  return NextResponse.json({ events: entries, total: entries.length });
}
// Analytics endpoint: aggregated usage metrics
