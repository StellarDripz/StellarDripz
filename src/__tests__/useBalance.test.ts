import { renderHook, act, waitFor } from "@testing-library/react";
let useBalance: any;
beforeAll(async () => { const m = await import("@/hooks/useBalance"); useBalance = m.useBalance; });
describe("useBalance", () => { it("returns empty when no address", () => { const { result } = renderHook(() => useBalance({ address: null })); expect(result.current.balance.xlm).toBe("0.0000000"); }); });
