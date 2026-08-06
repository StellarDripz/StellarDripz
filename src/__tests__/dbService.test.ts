/**
 * Tests for database service (transaction history and analytics)
 */
import { saveTransaction, getTransactions, logAnalytics, getAnalyticsSummary, clearDb } from "@/lib/server/dbService";

beforeEach(() => {
  // Clear the database between tests
  clearDb();
});

describe("dbService", () => {
  describe("saveTransaction and getTransactions", () => {
    it("saves and retrieves a transaction", () => {
      const tx = {
        id: "tx-test-1",
        type: "faucet" as const,
        status: "success" as const,
        hash: "abc123hash",
        amount: "10000",
        senderAddress: "friendbot",
        destinationAddress: "GDEST123456789012345678901234567890123456",
        timestamp: Date.now(),
      };

      saveTransaction(tx);
      const transactions = getTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe("tx-test-1");
      expect(transactions[0].type).toBe("faucet");
    });

    it("filters transactions by type", () => {
      saveTransaction({
        id: "tx-1", type: "faucet", status: "success", hash: "h1",
        amount: "10000", senderAddress: "f", destinationAddress: "d1", timestamp: Date.now(),
      });
      saveTransaction({
        id: "tx-2", type: "send", status: "success", hash: "h2",
        amount: "50", senderAddress: "d1", destinationAddress: "d2", timestamp: Date.now(),
      });
      saveTransaction({
        id: "tx-3", type: "contract", status: "success", hash: "h3",
        amount: "0", senderAddress: "d1", destinationAddress: "c1", timestamp: Date.now(),
      });

      const faucetTxs = getTransactions(undefined, "faucet");
      expect(faucetTxs).toHaveLength(1);
      expect(faucetTxs[0].id).toBe("tx-1");
    });

    it("limits return count", () => {
      for (let i = 0; i < 30; i++) {
        saveTransaction({
          id: `tx-${i}`, type: "faucet", status: "success", hash: `h${i}`,
          amount: "10000", senderAddress: "f", destinationAddress: `d${i}`, timestamp: Date.now() + i,
        });
      }

      const transactions = getTransactions(undefined, undefined, 10);
      expect(transactions).toHaveLength(10);
      // Most recent first
      expect(transactions[0].timestamp).toBeGreaterThan(transactions[9].timestamp);
    });
  });

  describe("logAnalytics and getAnalyticsSummary", () => {
    it("logs and retrieves analytics events", () => {
      logAnalytics({ eventType: "faucet_request", address: "0xaddr1" });
      logAnalytics({ eventType: "faucet_request", address: "0xaddr1" });
      logAnalytics({ eventType: "contract_invoke", address: "0xaddr2" });

      const summary = getAnalyticsSummary();
      expect(summary["faucet_request"].total).toBe(2);
      expect(summary["contract_invoke"].total).toBe(1);
    });

    it("tracks unique addresses", () => {
      logAnalytics({ eventType: "wallet_connect", address: "address1" });
      logAnalytics({ eventType: "wallet_connect", address: "address1" });
      logAnalytics({ eventType: "wallet_connect", address: "address2" });

      const summary = getAnalyticsSummary();
      expect(summary["wallet_connect"].uniqueAddresses).toBe(2);
    });
  });
});
// Edge case: handles malformed JSON in localStorage
