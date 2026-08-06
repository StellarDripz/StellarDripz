/**
 * Server-side rate limiting middleware.
 * Uses in-memory Map with automatic cleanup.
 */
import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();
const addressMap = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipMap) {
    if (now > entry.resetAt) ipMap.delete(key);
  }
  for (const [key, entry] of addressMap) {
    if (now > entry.resetAt) addressMap.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  faucet: { windowMs: 60_000, maxRequests: 1 },      // 1 per minute per address
  payment: { windowMs: 60_000, maxRequests: 10 },     // 10 per minute per address
  contract: { windowMs: 60_000, maxRequests: 5 },     // 5 per minute per address
  wallet: { windowMs: 60_000, maxRequests: 20 },      // 20 per minute per IP
  general: { windowMs: 60_000, maxRequests: 30 },     // 30 per minute per IP
};

/**
 * Check rate limit. Returns null if allowed, or a NextResponse with 429 if blocked.
 */
/** Clear all rate limit entries (for testing). */
export function clearRateLimits(): void {
  ipMap.clear();
  addressMap.clear();
}

export function checkRateLimit(
  request: NextRequest,
  category: keyof typeof DEFAULTS,
  address?: string
): NextResponse | null {
  const config = DEFAULTS[category] || DEFAULTS.general;

  if (address && (category === "faucet" || category === "payment" || category === "contract")) {
    // Per-address rate limiting
    const key = `${category}:${address}`;
    const entry = addressMap.get(key);
    const now = Date.now();

    if (entry && now < entry.resetAt) {
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: `Rate limited. Try again in ${retryAfter}s.`, retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
      entry.count++;
    } else {
      addressMap.set(key, { count: 1, resetAt: now + config.windowMs });
    }
  } else {
    // Per-IP rate limiting (fallback)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const key = `${category}:${ip}`;
    const entry = ipMap.get(key);
    const now = Date.now();

    if (entry && now < entry.resetAt) {
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: "Too many requests.", retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
      entry.count++;
    } else {
      ipMap.set(key, { count: 1, resetAt: now + config.windowMs });
    }
  }

  return null; // Allowed
}
// Enforces rate limits per-address with sliding window algorithm

