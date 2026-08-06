"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";

interface UseFaucetOptions { address: string | null; cooldownMs?: number; }
interface UseFaucetReturn { requesting: boolean; success: boolean; error: string | null; lastHash: string | null; cooldownRemaining: number; canRequest: boolean; request: () => Promise<void>; }

export function useFaucet(opts: UseFaucetOptions): UseFaucetReturn {
  return { requesting: false, success: false, error: null, lastHash: null, cooldownRemaining: 0, canRequest: false, request: async () => {} };
}
