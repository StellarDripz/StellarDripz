"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { TransactionRecord, TxType } from "@/types/stellar";

interface UseTransactionHistoryOptions { address?: string; type?: TxType; limit?: number; refreshInterval?: number; enabled?: boolean; }
interface UseTransactionHistoryReturn { transactions: TransactionRecord[]; loading: boolean; error: string | null; total: number; refresh: () => Promise<void>; }

export function useTransactionHistory(opts?: UseTransactionHistoryOptions): UseTransactionHistoryReturn {
  return { transactions: [], loading: false, error: null, total: 0, refresh: async () => {} };
}
