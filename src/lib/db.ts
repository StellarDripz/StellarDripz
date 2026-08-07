/**
 * Database client abstraction.
 * Currently uses in-memory + localStorage for analytics tracking.
 * Can be swapped for Supabase/Firebase/Postgres with the same interface.
 */

interface AnalyticsEvent {
  id: string;
  type: "faucet_request" | "send_payment" | "contract_call" | "wallet_connect";
  address: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = "stellardripz_analytics";

function getAll(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveAll(events: AnalyticsEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 1000)));
  } catch {
    /* blocked */
  }
}

/** Track an analytics event. */
export function trackEvent(
  type: AnalyticsEvent["type"],
  address: string,
  data?: Record<string, unknown>,
): void {
  const events = getAll();
  events.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    address,
    timestamp: Date.now(),
    data,
  });
  saveAll(events);
}

/** Get all tracked events (for admin dashboard). */
export function getAnalyticsEvents(type?: AnalyticsEvent["type"]): AnalyticsEvent[] {
  let events = getAll();
  if (type) events = events.filter((e) => e.type === type);
  return events;
}

/** Get event counts by type. */
export function getAnalyticsSummary(): Record<string, number> {
  const events = getAll();
  const summary: Record<string, number> = {};
  for (const e of events) {
    summary[e.type] = (summary[e.type] || 0) + 1;
  }
  return summary;
}

/** Clear all analytics data. */
export function clearAnalytics(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type { AnalyticsEvent };
// Analytics tracking via localStorage with event batching support
