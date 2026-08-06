/**
 * GET /api/history — Transaction history from database
 * Query: ?address=G...&type=faucet|send|contract&limit=50
 */
import { NextRequest, NextResponse } from "next/server";
import { getTransactions, type TxRecord } from "@/lib/server/dbService";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") || undefined;
  const type = url.searchParams.get("type") as TxRecord["type"] | null;
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const transactions = getTransactions(address, type || undefined, Math.min(limit, 100));

  return NextResponse.json({ transactions, total: transactions.length });
}
// History endpoint: filtered transaction query with pagination
