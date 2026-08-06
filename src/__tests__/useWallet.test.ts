import { renderHook, act, waitFor } from "@testing-library/react";
let useWallet: any;
beforeAll(async () => { const m = await import("@/hooks/useWallet"); useWallet = m.useWallet; });
describe("useWallet", () => { it("returns disconnected initially", () => { const { result } = renderHook(() => useWallet()); expect(result.current.wallet.connected).toBe(false); }); });
