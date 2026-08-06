/**
 * Unit tests for walletService (persistence layer)
 * Uses jsdom's real localStorage.
 */
import {
  persistWallet,
  loadPersistedWallet,
  clearPersistedWallet,
} from "@/services/walletService";

const STORAGE_KEY = "stellardripz_wallet";

beforeEach(() => {
  localStorage.clear();
});

describe("walletService (persistence)", () => {
  const mockWallet = {
    publicKey: "GDEST123456789012345678901234567890123456",
    walletId: "freighter",
    walletName: "Freighter",
    connectedAt: Date.now(),
  };

  describe("persistWallet", () => {
    it("saves wallet to localStorage", () => {
      persistWallet(mockWallet);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.publicKey).toBe(mockWallet.publicKey);
      expect(parsed.walletId).toBe(mockWallet.walletId);
    });
  });

  describe("loadPersistedWallet", () => {
    it("returns null when no wallet is stored", () => {
      expect(loadPersistedWallet()).toBeNull();
    });

    it("returns stored wallet when valid", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockWallet));

      const loaded = loadPersistedWallet();
      expect(loaded).not.toBeNull();
      expect(loaded!.publicKey).toBe(mockWallet.publicKey);
      expect(loaded!.walletId).toBe(mockWallet.walletId);
    });

    it("returns null when stored data is invalid JSON", () => {
      localStorage.setItem(STORAGE_KEY, "not-valid-json");

      const loaded = loadPersistedWallet();
      expect(loaded).toBeNull();
    });

    it("returns null when wallet expired (>24h)", () => {
      const expiredWallet = {
        ...mockWallet,
        connectedAt: Date.now() - 25 * 60 * 60 * 1000,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredWallet));

      const loaded = loadPersistedWallet();
      expect(loaded).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null when stored wallet has no publicKey", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ walletId: "freighter", connectedAt: Date.now() })
      );

      const loaded = loadPersistedWallet();
      expect(loaded).toBeNull();
    });

    it("returns null when stored wallet has no walletId", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ publicKey: "G...", connectedAt: Date.now() })
      );

      const loaded = loadPersistedWallet();
      expect(loaded).toBeNull();
    });
  });

  describe("clearPersistedWallet", () => {
    it("removes wallet from localStorage", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockWallet));

      clearPersistedWallet();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
