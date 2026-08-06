import { getCooldownRemaining, recordFaucetRequest, canRequestFaucet, clearAllCooldowns } from "@/lib/rateLimiter";
describe("client rateLimiter", () => {
  it("allows first request", () => { expect(canRequestFaucet("GADDR")).toBe(true); });
});
