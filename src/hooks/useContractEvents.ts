"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ContractEvent } from "@/types/stellar";

interface UseContractEventsOptions { contractId: string; pollInterval?: number; enabled?: boolean; }

export function useContractEvents(opts: UseContractEventsOptions) {
  return { events: [] as ContractEvent[], connected: false, error: null as string | null, clearEvents: () => {} };
}
