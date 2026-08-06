/**
 * Unit tests for config and transaction service pure functions
 */
import { STELLAR_CONFIG } from "@/config";
import { getExplorerUrl } from "@/services/transactionService";

describe("STELLAR_CONFIG", () => {
  it("has required Stellar testnet configuration", () => {
    expect(STELLAR_CONFIG.network).toBe("TESTNET");
    expect(STELLAR_CONFIG.horizonUrl).toBe(
      "https://horizon-testnet.stellar.org"
    );
    expect(STELLAR_CONFIG.friendbotUrl).toBe("https://friendbot.stellar.org");
    expect(STELLAR_CONFIG.networkPassphrase).toBe(
      "Test SDF Network ; September 2015"
    );
    expect(STELLAR_CONFIG.stellarExpertUrl).toBe(
      "https://stellar.expert/explorer/testnet"
    );
  });
});

describe("getExplorerUrl", () => {
  it("returns the correct Stellar Expert URL for a transaction hash", () => {
    const hash = "abc123def456";
    const url = getExplorerUrl(hash);

    expect(url).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123def456"
    );
  });
});
