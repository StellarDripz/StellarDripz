"use client";

import { useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { simulateContract, buildContractCall, submitContract } from "@/lib/client/apiClient";
import { signTx } from "@/lib/wallets/walletKit";
import { showToast } from "./Toast";

interface SorobanDemoProps { contractId: string; }

export default function SorobanDemo({ contractId }: SorobanDemoProps) {
  const { state, addContractEvent } = useAppContext();
  const [counter, setCounter] = useState<number | null>(null);
  const [greeting, setGreeting] = useState("");
  const [newGreeting, setNewGreeting] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetCounter = useCallback(async () => {
    if (!state.wallet.publicKey) return; setLoading(true);
    try {
      const { resultValue } = await simulateContract(contractId, "get_global", [], state.wallet.publicKey);
      setCounter(resultValue ? parseInt(resultValue, 10) : 0);
    } catch (err) {
      showToast({ type: "error", title: "Read failed", message: err instanceof Error ? err.message : "Error" });
    } finally { setLoading(false); }
  }, [state.wallet.publicKey, contractId]);

  const handleIncrement = useCallback(async () => {
    if (!state.wallet.publicKey) return; setLoading(true);
    try {
      const address = state.wallet.publicKey;
      const { xdr } = await buildContractCall(contractId, "increment", [address], address);
      const signedXdr = await signTx(xdr, address);
      const { hash, resultValue } = await submitContract(signedXdr, contractId, "increment", address);

      setCounter(resultValue ? parseInt(resultValue, 10) : (counter || 0) + 1);
      showToast({ type: "success", title: "Incremented!", message: `TX: ${hash.slice(0, 10)}...` });
    } catch (err) {
      showToast({ type: "error", title: "Increment failed", message: err instanceof Error ? err.message : "Error" });
    } finally { setLoading(false); }
  }, [state.wallet.publicKey, contractId, counter]);

  const handleGetGreeting = useCallback(async () => {
    if (!state.wallet.publicKey) return; setLoading(true);
    try {
      const { resultValue } = await simulateContract(contractId, "get_greeting", [], state.wallet.publicKey);
      setGreeting((resultValue as string) || "Hello from StellarDripz!");
    } catch { setGreeting("Hello from StellarDripz!"); }
    finally { setLoading(false); }
  }, [state.wallet.publicKey, contractId]);

  const handleSetGreeting = useCallback(async () => {
    if (!state.wallet.publicKey || !newGreeting.trim()) return; setLoading(true);
    try {
      const address = state.wallet.publicKey;
      const { xdr } = await buildContractCall(contractId, "set_greeting", [address, newGreeting.trim()], address);
      const signedXdr = await signTx(xdr, address);
      await submitContract(signedXdr, contractId, "set_greeting", address);

      setGreeting(newGreeting.trim()); setNewGreeting("");
      showToast({ type: "success", title: "Greeting updated!", message: newGreeting.trim() });
    } catch (err) {
      showToast({ type: "error", title: "Set greeting failed", message: err instanceof Error ? err.message : "Error" });
    } finally { setLoading(false); }
  }, [state.wallet.publicKey, contractId, newGreeting]);

  return (
    <div className="space-y-4 rounded-2xl border border-stellar-purple/20 bg-surface-800/60 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stellar-purple/10 text-sm">📜</div>
        <div>
          <h3 className="text-sm font-semibold text-white">Soroban Demo</h3>
          <p className="font-mono text-[10px] text-white/30">{contractId.slice(0, 12)}...</p>
        </div>
      </div>
      {/* Counter */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] text-white/30">Counter</p><p className="text-xl font-bold text-white">{counter !== null ? counter : "—"}</p></div>
          <div className="flex gap-2">
            <button onClick={handleGetCounter} disabled={loading} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-50">Read</button>
            <button onClick={handleIncrement} disabled={loading} className="rounded-lg bg-gradient-to-r from-stellar-purple to-stellar-blue px-3 py-1.5 text-xs font-semibold text-white hover:shadow-lg active:scale-95 disabled:opacity-50">+1</button>
          </div>
        </div>
      </div>
      {/* Greeting */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[10px] text-white/30 mb-1">Greeting</p>
        <p className="text-sm text-white mb-2">{greeting || "—"}</p>
        <div className="flex gap-2">
          <input type="text" value={newGreeting} onChange={(e) => setNewGreeting(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetGreeting()}
            placeholder="New greeting..." disabled={loading}
            className="flex-1 rounded-lg border border-white/10 bg-surface-950 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-stellar-purple/50 focus:outline-none disabled:opacity-50" />
          <button onClick={handleSetGreeting} disabled={loading || !newGreeting.trim()}
            className="rounded-lg border border-stellar-purple/30 bg-stellar-purple/10 px-3 py-1.5 text-xs font-medium text-stellar-purple hover:bg-stellar-purple/20 disabled:opacity-30">Set</button>
          <button onClick={handleGetGreeting} disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-50">Read</button>
        </div>
      </div>
    </div>
  );
}
