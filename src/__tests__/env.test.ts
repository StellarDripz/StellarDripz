/**
 * Tests for env validation and configuration
 */
import { getAppConfig, validateEnv } from "@/lib/env";

describe("getAppConfig", () => {
  it("returns default config with fallback values", () => {
    const config = getAppConfig();

    expect(config.nodeEnv).toBe("test");
    expect(config.isTestnet).toBe(true);
    expect(config.sorobanRpcUrl).toBe("https://soroban-testnet.stellar.org");
    expect(config.horizonUrl).toBe("https://horizon-testnet.stellar.org");
    expect(config.friendbotUrl).toBe("https://friendbot.stellar.org");
    expect(config.rateLimitFaucet).toBe(60000);
    expect(config.rateLimitContract).toBe(30000);
  });

  it("returns null for unset contract IDs", () => {
    const config = getAppConfig();

    expect(config.contractIdCounter).toBeNull();
    expect(config.contractIdDripToken).toBeNull();
    expect(config.contractIdDripPool).toBeNull();
    expect(config.contractIdGovernance).toBeNull();
    expect(config.contractIdBadge).toBeNull();
  });

  it("returns cached config on subsequent calls", () => {
    const config1 = getAppConfig();
    const config2 = getAppConfig();

    expect(config1).toBe(config2);
  });

  it("produces valid app config with all required fields", () => {
    const config = getAppConfig();

    // Verify all required types
    expect(typeof config.sorobanRpcUrl).toBe("string");
    expect(typeof config.horizonUrl).toBe("string");
    expect(typeof config.networkPassphrase).toBe("string");
    expect(typeof config.friendbotUrl).toBe("string");
    expect(typeof config.isTestnet).toBe("boolean");
  });
});

describe("validateEnv", () => {
  it("returns valid with no errors for default config", () => {
    const result = validateEnv();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports warnings for missing contract IDs", () => {
    const result = validateEnv();

    expect(result.warnings.some((w) => w.includes("contract IDs"))).toBe(true);
  });
});
