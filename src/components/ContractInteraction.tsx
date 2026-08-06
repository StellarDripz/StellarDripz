"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  simulateContractCall,
  callContractFunction,
  getLatestLedger,
  fetchContractEvents,
} from "@/lib/stellar/soroban";
import { showToast } from "./Toast";
import * as StellarSdk from "@stellar/stellar-sdk";

interface Props {
  contractId: string | null;
}

export default function ContractInteraction({ contractId }: Props) {
  const { state, addContractEvent, clearContractEvents } = useAppContext();
  const [counter, setCounter] = useState<number | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [newGreeting, setNewGreeting] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLedger, setLastLedger] = useState(0);

  // Poll for events when contract is active
  useEffect(() => {
    if (!contractId) return;
    let interval: ReturnType<typeof setInterval>;
    let isStale = false;

    const init = async () => {
      if (isStale) return;
      try {
        const ledger = await getLatestLedger();
        if (!isStale) setLastLedger(ledger);
      } catch { /* ignore */ }
    };
    init();

    const poll = async () => {
      if (isStale) return;
      try {
        const { events, latestLedger } = await fetchContractEvents(
          contractId,
          lastLedger || 0
        );
        if (!isStale && events.length > 0) {
          for (const evt of events) {
            addContractEvent({
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              contractId: evt.contractId,
              topic: evt.topic,
              value: evt.value,
              ledgerSequence: latestLedger,
              timestamp: new Date(),
              txHash: "",
            });
          }
        }
        if (!isStale) setLastLedger((prev) => latestLedger || prev);
      } catch {
        // retry next cycle
      }
    };

    interval = setInterval(poll, 5000);
    return () => {
      isStale = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // --- Read Counter (simulate only) ---
  const handleGetCounter = useCallback(async () => {
    if (!state.wallet.publicKey || !contractId) return;
    setLoading(true);
    try {
      const { resultValue } = await simulateContractCall(
        contractId,
        "get_global",
        [],
        state.wallet.publicKey
      );
      setCounter(resultValue ? parseInt(resultValue, 10) : 0);
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to read counter",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [state.wallet.publicKey, contractId]);

  // --- Increment Counter (sign + submit) ---
  const handleIncrement = useCallback(async () => {
    if (!state.wallet.publicKey || !contractId) return;
    setLoading(true);
    try {
      const address = new StellarSdk.Address(state.wallet.publicKey);
      const userScVal = address.toScVal();

      const { resultValue, events } = await callContractFunction(
        contractId,
        "increment",
        [userScVal],
        state.wallet.publicKey
      );

      const newCount = resultValue ? parseInt(resultValue, 10) : (counter || 0) + 1;
      setCounter(newCount);

      showToast({
        type: "success",
        title: "Counter incremented!",
        message: `New value: ${newCount}`,
      });

      if (events) {
        for (const evt of events) {
          addContractEvent({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            contractId: evt.contractId,
            topic: evt.topic,
            value: evt.value,
            ledgerSequence: 0,
            timestamp: new Date(),
            txHash: "",
          });
        }
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to increment",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [state.wallet.publicKey, contractId, counter, addContractEvent]);

  // --- Read Greeting (simulate only) ---
  const handleGetGreeting = useCallback(async () => {
    if (!state.wallet.publicKey || !contractId) return;
    setLoading(true);
    try {
      const { resultValue } = await simulateContractCall(
        contractId,
        "get_greeting",
        [],
        state.wallet.publicKey
      );
      setGreeting((resultValue as string) || "Hello from StellarDripz!");
    } catch {
      setGreeting("Hello from StellarDripz!");
    } finally {
      setLoading(false);
    }
  }, [state.wallet.publicKey, contractId]);

  // --- Set Greeting (sign + submit) ---
  const handleSetGreeting = useCallback(async () => {
    if (!state.wallet.publicKey || !contractId || !newGreeting.trim()) return;
    setLoading(true);
    try {
      const address = new StellarSdk.Address(state.wallet.publicKey);
      const userScVal = address.toScVal();
      const msgScVal = StellarSdk.xdr.ScVal.scvString(newGreeting.trim());

      const { events } = await callContractFunction(
        contractId,
        "set_greeting",
        [userScVal, msgScVal],
        state.wallet.publicKey
      );

      setGreeting(newGreeting.trim());
      setNewGreeting("");
      showToast({
        type: "success",
        title: "Greeting updated!",
        message: newGreeting.trim(),
      });

      if (events) {
        for (const evt of events) {
          addContractEvent({
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            contractId: evt.contractId,
            topic: evt.topic,
            value: evt.value,
            ledgerSequence: 0,
            timestamp: new Date(),
            txHash: "",
          });
        }
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to set greeting",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [state.wallet.publicKey, contractId, newGreeting, addContractEvent]);

  if (!contractId) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-surface-800/30 p-6 text-center">
        <p className="text-sm text-white/40">
          No contract deployed yet. Use the deploy script at{" "}
          <code className="text-stellar-purple/60">scripts/deploy-contract.ts</code>{" "}
          to deploy to testnet, then paste the contract ID above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-stellar-purple/20 bg-surface-800/60 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stellar-purple/10 text-lg">
            📜
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Smart Contract
            </h3>
            <p className="font-mono text-[10px] text-stellar-purple truncate max-w-[180px]">
              {contractId.slice(0, 12)}...{contractId.slice(-8)}
            </p>
          </div>
        </div>
        <button
          onClick={clearContractEvents}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          Clear Events
        </button>
      </div>

      {/* Counter Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">Global Counter</p>
            <p className="text-2xl font-bold text-white mt-1">
              {counter !== null ? counter : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGetCounter}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10 disabled:opacity-50"
            >
              Read
            </button>
            <button
              onClick={handleIncrement}
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-stellar-purple to-stellar-blue px-4 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-lg hover:shadow-stellar-purple/25 active:scale-95 disabled:opacity-50"
            >
              + Increment
            </button>
          </div>
        </div>
      </div>

      {/* Greeting Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs text-white/40 mb-2">Stored Greeting</p>
        <p className="text-sm text-white font-medium mb-3">
          {greeting || "—"}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGreeting}
            onChange={(e) => setNewGreeting(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSetGreeting()}
            placeholder="Enter a greeting..."
            className="flex-1 rounded-lg border border-white/10 bg-surface-950 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-stellar-purple/50 focus:outline-none"
          />
          <button
            onClick={handleSetGreeting}
            disabled={loading || !newGreeting.trim()}
            className="rounded-lg border border-stellar-purple/30 bg-stellar-purple/10 px-3 py-1.5 text-xs font-medium text-stellar-purple transition-all hover:bg-stellar-purple/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Set
          </button>
          <button
            onClick={handleGetGreeting}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10 disabled:opacity-50"
          >
            Read
          </button>
        </div>
      </div>

      {/* Event Logs */}
      {state.contractEvents.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/40 mb-2">
            Contract Events ({state.contractEvents.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1.5">
            {state.contractEvents.slice(0, 10).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center gap-2 text-[10px] font-mono"
              >
                <span className="text-stellar-purple">[{evt.topic}]</span>
                <span className="text-white/50">{evt.value}</span>
                <span className="text-white/20 ml-auto">
                  L{evt.ledgerSequence}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
