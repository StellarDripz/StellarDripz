/**
 * Tests for useContractEvents hook and contract event types.
 */
import { renderHook, act } from "@testing-library/react";
import { useContractEvents } from "@/hooks/useContractEvents";
import type { ContractEvent } from "@/types/stellar";

// Mock EventSource
class MockEventSource {
  onopen: ((this: EventSource, ev: Event) => void) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent<string>) => void) | null = null;
  onerror: ((this: EventSource, ev: Event) => void) | null = null;
  url: string;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
  }

  close() {
    this.readyState = 2;
  }
}

// @ts-expect-error: mock EventSource globally
global.EventSource = MockEventSource;

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  jest.useRealTimers();
  // @ts-expect-error: reset EventSource mock
  global.EventSource = MockEventSource;
});

describe("useContractEvents", () => {
  describe("type definitions", () => {
    it("ContractEvent has required fields", () => {
      const event: ContractEvent = {
        id: "evt-1",
        contractId: "CCONTRACT123",
        topic: "increment",
        value: "42",
        ledgerSequence: 5000,
        timestamp: new Date(),
        txHash: "abc123",
      };

      expect(event.contractId).toBe("CCONTRACT123");
      expect(event.topic).toBe("increment");
      expect(event.value).toBe("42");
      expect(event.ledgerSequence).toBe(5000);
      expect(event.txHash).toBe("abc123");
    });
  });

  describe("initial state", () => {
    it("returns empty events when disabled", () => {
      const { result } = renderHook(() =>
        useContractEvents({ contractId: "CC123", enabled: false })
      );

      expect(result.current.events).toEqual([]);
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("returns empty events when no contractId", () => {
      const { result } = renderHook(() =>
        useContractEvents({ contractId: "", enabled: true })
      );

      expect(result.current.events).toEqual([]);
    });
  });

  describe("SSE connection", () => {
    it("adds event when SSE message received", () => {
      let capturedOnMessage: ((event: { data: string }) => void) | null = null;

      class CaptureEventSource {
        url: string;
        onopen: (() => void) | null = null;
        onmessage: ((event: { data: string }) => void) | null = null;
        onerror: (() => void) | null = null;
        readyState: number = 0;
        constructor(url: string) {
          this.url = url;
          capturedOnMessage = (event: { data: string }) => {
            if (this.onmessage) this.onmessage(event);
          };
        }
        close() {
          this.readyState = 2;
        }
      }
      // @ts-expect-error: override mock
      global.EventSource = CaptureEventSource;

      const { result } = renderHook(() =>
        useContractEvents({ contractId: "CCONTRACT123", enabled: true })
      );

      act(() => {
        if (capturedOnMessage) {
          capturedOnMessage({
            data: JSON.stringify({
              id: "evt-1",
              contractId: "CCONTRACT123",
              topic: "increment",
              value: "42",
              ledgerSequence: 5000,
              timestamp: new Date(),
              txHash: "abc123",
            }),
          });
        }
      });

      expect(result.current.events.length).toBe(1);
      expect(result.current.events[0].topic).toBe("increment");
      expect(result.current.events[0].value).toBe("42");
    });
  });

  describe("polling fallback", () => {
    it("falls back to polling when EventSource throws on construction", async () => {
      jest.useFakeTimers();

      // Make EventSource constructor throw
      // @ts-expect-error: make EventSource throw
      global.EventSource = class {
        constructor() {
          throw new Error("SSE not available");
        }
        close() {}
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resultValue: "0", events: [] }),
      });

      renderHook(() =>
        useContractEvents({ contractId: "CCONTRACT123", pollInterval: 5000 })
      );

      // Advance past the poll interval
      await act(async () => {
        jest.advanceTimersByTime(5001);
      });

      // Polling should have fired — fetch should be called
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("clearEvents", () => {
    it("clears all events", () => {
      class SilentEventSource {
        url: string;
        onopen: (() => void) | null = null;
        onmessage: ((event: { data: string }) => void) | null = null;
        onerror: (() => void) | null = null;
        readyState: number = 0;
        constructor(url: string) {
          this.url = url;
        }
        close() {
          this.readyState = 2;
        }
      }
      // @ts-expect-error: override mock
      global.EventSource = SilentEventSource;

      const { result } = renderHook(() =>
        useContractEvents({ contractId: "CCONTRACT123" })
      );

      act(() => {
        result.current.clearEvents();
      });

      expect(result.current.events).toEqual([]);
    });
  });

  describe("event limit", () => {
    it("keeps at most 100 events", () => {
      let capturedOnMessage: ((event: { data: string }) => void) | null = null;

      class CaptureEventSource {
        url: string;
        onopen: (() => void) | null = null;
        onmessage: ((event: { data: string }) => void) | null = null;
        onerror: (() => void) | null = null;
        readyState: number = 0;
        constructor(url: string) {
          this.url = url;
          capturedOnMessage = (event: { data: string }) => {
            if (this.onmessage) this.onmessage(event);
          };
        }
        close() {
          this.readyState = 2;
        }
      }
      // @ts-expect-error: override mock
      global.EventSource = CaptureEventSource;

      const { result } = renderHook(() =>
        useContractEvents({ contractId: "CCONTRACT123" })
      );

      // Send 150 events
      for (let i = 0; i < 150; i++) {
        act(() => {
          if (capturedOnMessage) {
            capturedOnMessage({
              data: JSON.stringify({
                id: `evt-${i}`,
                contractId: "CCONTRACT123",
                topic: `topic-${i}`,
                value: String(i),
                ledgerSequence: i,
                timestamp: new Date(),
                txHash: `hash-${i}`,
              }),
            });
          }
        });
      }

      expect(result.current.events.length).toBeLessThanOrEqual(100);
    });
  });
});
