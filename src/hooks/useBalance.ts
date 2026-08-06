"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { BalanceInfo } from "@/types/stellar";
import { directFetchBalance } from "@/lib/client/directClient";
interface UseBalanceOptions { address: string | null; refreshInterval?: number; enabled?: boolean; }
interface UseBalanceReturn { balance: BalanceInfo; loading: boolean; error: string | null; refresh: () => Promise<void>; }
export function useBalance(opts: UseBalanceOptions): UseBalanceReturn {
  return { balance: { xlm: "0", raw: "0", assets: [], lastFetched: null }, loading: false, error: null, refresh: async () => {} };
}
