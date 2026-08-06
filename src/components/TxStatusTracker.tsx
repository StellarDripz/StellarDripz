"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";

/**
 * Tracks the live status of the most recent transactions.
 * Shows pending/success/error state with auto-refresh.
 */
export default function TxStatusTracker() {
  const { state } = useAppContext();
  const [dots, setDots] = useState(".");

  // Animate pending dots
  useEffect(() => {
    if (state.txInProgress !== "pending") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [state.txInProgress]);

  const latestTx = state.transactions[0] || null;
  const inProgress = state.txInProgress !== "idle";

  if (!inProgress && !latestTx) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
          {state.txInProgress === "pending" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400/50 border-t-yellow-400" />
          ) : state.txInProgress === "success" ? (
            <span className="text-green-400">✓</span>
          ) : state.txInProgress === "error" ? (
            <span className="text-red-400">✗</span>
          ) : (
            <span className="text-white/30">•</span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {state.txInProgress === "pending"
              ? `Transaction Pending${dots}`
              : state.txInProgress === "success"
              ? "Transaction Successful"
              : state.txInProgress === "error"
              ? "Transaction Failed"
              : "Transaction Status"}
          </p>
          {latestTx && (
            <p className="text-[10px] text-white/40 font-mono">
              {latestTx.type.toUpperCase()} — {latestTx.amount} {latestTx.assetCode || "XLM"}
            </p>
          )}
        </div>
      </div>

      {/* Live status bar */}
      {state.txInProgress === "pending" && (
        <div className="relative h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="absolute inset-y-0 left-0 animate-pulse rounded-full bg-yellow-400/50 w-1/2" />
        </div>
      )}
      {state.txInProgress === "success" && latestTx?.hash && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2">
          <p className="text-[10px] text-green-400 font-mono break-all">
            TX: {latestTx.hash.slice(0, 20)}...
          </p>
        </div>
      )}
      {state.txInProgress === "error" && latestTx?.errorMessage && (
        <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
          <p className="text-[10px] text-red-400">
            {latestTx.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
