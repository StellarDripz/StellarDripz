/**
 * Tests for client-side rate limiter.
 * (Server-side rate limiter requires Next.js server runtime, tested via integration.)
 */
import { getCooldownRemaining, recordFaucetRequest, canRequestFaucet, clearAllCooldowns } from "@/lib/rateLimiter";

beforeEach(() => {
  clearAllCooldowns();
});

describe("client rateLimiter", () => {
  describe("getCooldownRemaining", () => {
    it("returns 0 when no entry exists", () => {
      const remaining = getCooldownRemaining("GADDR123");
      expect(remaining).toBe(0);
    });

    it("returns remaining time after a request", () => {
      recordFaucetRequest("GADDR123");
      const remaining = getCooldownRemaining("GADDR123");
      // Should be positive and <= 60000
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60000);
    });

    it("returns 0 for different addresses", () => {
      recordFaucetRequest("GADDR123");
      const remaining = getCooldownRemaining("GADDR456");
      expect(remaining).toBe(0);
    });
  });

  describe("canRequestFaucet", () => {
    it("allows first request", () => {
      expect(canRequestFaucet("GADDR123")).toBe(true);
    });

    it("blocks immediate second request", () => {
      recordFaucetRequest("GADDR123");
      expect(canRequestFaucet("GADDR123")).toBe(false);
    });
  });

  describe("clearAllCooldowns", () => {
    it("resets all cooldowns", () => {
      recordFaucetRequest("GADDR123");
      expect(canRequestFaucet("GADDR123")).toBe(false);

      clearAllCooldowns();
      expect(canRequestFaucet("GADDR123")).toBe(true);
    });
  });
});
// Edge case: validates rate limit after multiple rapid requests
