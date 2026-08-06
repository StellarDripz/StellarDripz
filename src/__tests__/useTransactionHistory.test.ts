import { renderHook, act, waitFor } from "@testing-library/react";
let useTransactionHistory: any;
beforeAll(async () => { const m = await import("@/hooks/useTransactionHistory"); useTransactionHistory = m.useTransactionHistory; });
describe("useTransactionHistory", () => { it("returns empty when disabled", () => { const { result } = renderHook(() => useTransactionHistory({ enabled: false })); expect(result.current.transactions).toEqual([]); }); });
