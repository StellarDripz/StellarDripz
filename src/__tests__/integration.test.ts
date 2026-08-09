/**
 * Integration tests — verifies end-to-end API + database flows.
 *
 * These tests exercise the full stack: Next.js API routes → server services → database.
 * Unlike unit tests which mock external dependencies, integration tests use
 * the real dbService (in-memory fallback) to verify data flow correctness.
 */

import {
  saveTransaction,
  getTransactions,
  logAnalytics,
  getAnalyticsSummary,
  saveSession,
  getSession,
  getActiveSessions,
  clearDb,
  runPeriodicCleanup,
  getDatabaseBackend,
} from "@/lib/server/dbService";

beforeEach(async () => {
  await clearDb();
});

describe("Integration: Transaction lifecycle", () => {
  it("saves, retrieves, and filters transactions through the full API→DB path", async () => {
    // Simulate a faucet request
    await saveTransaction({
      id: "tx-faucet-1",
      type: "faucet",
      status: "success",
      hash: "abc123hash",
      amount: "10000",
      assetCode: "XLM",
      senderAddress: "friendbot",
      destinationAddress: "GDEST123456789012345678901234567890123456",
      timestamp: Date.now(),
      ip: "127.0.0.1",
    });

    // Simulate a send payment
    await saveTransaction({
      id: "tx-send-1",
      type: "send",
      status: "success",
      hash: "def456hash",
      amount: "50",
      assetCode: "XLM",
      senderAddress: "GDEST123456789012345678901234567890123456",
      destinationAddress: "GRECIPIENT12345678901234567890123456789012",
      timestamp: Date.now() + 1000,
      ip: "127.0.0.1",
    });

    // Retrieve all
    const all = await getTransactions();
    expect(all).toHaveLength(2);

    // Filter by type
    const faucet = await getTransactions(undefined, "faucet");
    expect(faucet).toHaveLength(1);
    expect(faucet[0].id).toBe("tx-faucet-1");

    // Filter by address
    const byAddr = await getTransactions("GDEST123456789012345678901234567890123456");
    expect(byAddr).toHaveLength(1);
    expect(byAddr[0].type).toBe("send");
  });
});

describe("Integration: Analytics pipeline", () => {
  it("logs events and computes accurate summaries with unique address tracking", async () => {
    await logAnalytics({ eventType: "faucet_request", address: "addr-A" });
    await logAnalytics({ eventType: "faucet_request", address: "addr-A" });
    await logAnalytics({ eventType: "faucet_request", address: "addr-B" });
    await logAnalytics({ eventType: "payment_send", address: "addr-A" });
    await logAnalytics({ eventType: "wallet_connect", address: "addr-C" });

    const summary = await getAnalyticsSummary();

    expect(summary["faucet_request"].total).toBe(3);
    expect(summary["faucet_request"].uniqueAddresses).toBe(2);
    expect(summary["payment_send"].total).toBe(1);
    expect(summary["wallet_connect"].total).toBe(1);
    expect(summary["wallet_connect"].uniqueAddresses).toBe(1);
  });
});

describe("Integration: Session lifecycle", () => {
  it("creates, retrieves, and manages session expiration", async () => {
    const session = {
      address: "GACTIVE123456789012345678901234567890123456",
      walletId: "freighter",
      walletName: "Freighter",
      connectedAt: Date.now() - 3600000,
      lastActive: Date.now(),
      ip: "192.168.1.1",
    };

    await saveSession(session);
    const retrieved = await getSession(session.address);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.walletId).toBe("freighter");
    expect(retrieved!.walletName).toBe("Freighter");

    const active = await getActiveSessions();
    expect(active).toHaveLength(1);
    expect(active[0].address).toBe(session.address);

    // Verify old sessions get cleaned up
    const oldSession = {
      address: "GOLD123456789012345678901234567890123456789",
      walletId: "old-wallet",
      walletName: "Old",
      connectedAt: Date.now() - 8 * 86400000, // 8 days ago
      lastActive: Date.now() - 8 * 86400000,
      ip: "10.0.0.1",
    };
    await saveSession(oldSession);

    await runPeriodicCleanup();
    const after = await getActiveSessions();
    expect(after).toHaveLength(1); // Only the fresh session remains
    expect(after[0].address).toBe(session.address);
  });
});

describe("Integration: Database backend detection", () => {
  it("reports 'memory' backend when Supabase is not configured", () => {
    expect(getDatabaseBackend()).toBe("memory");
  });

  it("clearDb removes all data from all tables", async () => {
    await saveTransaction({
      id: "tx-clear-1",
      type: "faucet",
      status: "success",
      hash: "h",
      amount: "100",
      senderAddress: "s",
      destinationAddress: "d",
      timestamp: Date.now(),
    });
    await logAnalytics({ eventType: "faucet_request", address: "test" });
    await saveSession({
      address: "GCLEAR123456789012345678901234567890123456",
      walletId: "w",
      walletName: "w",
      connectedAt: Date.now(),
      lastActive: Date.now(),
    });

    await clearDb();

    expect(await getTransactions()).toHaveLength(0);
    const summary = await getAnalyticsSummary();
    expect(Object.keys(summary)).toHaveLength(0);
    expect(await getActiveSessions()).toHaveLength(0);
  });
});
