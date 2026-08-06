"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ContractEvent } from "@/types/stellar";

interface UseContractEventsOptions {
  contractId: string;
  pollInterval?: number;
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time contract events via SSE.
 * Falls back to polling if SSE is not supported.
 */
export function useContractEvents({
  contractId,
  pollInterval = 5000,
  enabled = true,
}: UseContractEventsOptions) {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    setError("SSE unavailable — polling for events");

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/contract/invoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractId,
            functionName: "get_events",
            signerAddress:
              "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            simulate: true,
          }),
        });
        const data = await res.json();
        if (!mountedRef.current) return;

        if (data.events) {
          for (const evt of data.events) {
            const mapped: ContractEvent = {
              id: `${evt.topic || "evt"}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              contractId,
              topic: evt.topic || "unknown",
              value: evt.value || "",
              ledgerSequence: evt.ledgerSequence || 0,
              timestamp: new Date(),
              txHash: evt.txHash || "",
            };
            setEvents((prev) => [mapped, ...prev].slice(0, 100));
          }
        }
        setConnected(true);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Poll failed");
      }
    }, pollInterval);
  }, [contractId, pollInterval]);    // Main effect: connect SSE or fall back to polling
  useEffect(() => {
    if (!enabled || !contractId) return;

    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();

    let cancelled = false;

    // Try SSE first
    try {
      const es = new EventSource(
        `/api/events?contractId=${encodeURIComponent(contractId)}&pollInterval=${pollInterval}`
      );
      eventSourceRef.current = es;

      es.onopen = () => {
        if (cancelled || !mountedRef.current) return;
        setConnected(true);
        setError(null);
      };

      es.onmessage = (event) => {
        if (cancelled || !mountedRef.current) return;
        try {
          const parsed: ContractEvent = JSON.parse(event.data);
          setEvents((prev) => [parsed, ...prev].slice(0, 100));
        } catch {
          /* skip malformed */
        }
      };

      es.onerror = () => {
        if (cancelled || !mountedRef.current) return;
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
        // Fall back to polling
        startPolling();
      };
    } catch {
      // EventSource constructor threw — fall back to polling immediately
      startPolling();
    }

    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPolling();
    };
  }, [contractId, pollInterval, enabled, startPolling, stopPolling]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, error, clearEvents };
}
