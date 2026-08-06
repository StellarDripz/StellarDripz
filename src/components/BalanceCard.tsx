"use client";

import { useAppContext } from "@/context/AppContext";
import { useState } from "react";

export default function BalanceCard() {
  const { state, refreshBalance } = useAppContext();
  const { wallet, balance } = state;
  const [refreshing, setRefreshing] = useState(false);

  if (!wallet.connected) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          XLM Balance
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing || balance.loading}
          className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 transition-all hover:border-white/20 hover:text-white/80 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${
              refreshing ? "animate-spin" : "group-hover:rotate-180"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {balance.error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">
            Failed to load balance. The account may not exist yet — try the faucet!
          </p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-xs text-red-300 underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      ) : balance.loading ? (
        <div className="flex items-center gap-3 py-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-white/5" />
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white tracking-tight">
            {balance.xlm}
          </span>
          <span className="text-lg font-semibold text-stellar-blue">XLM</span>
        </div>
      )}

      {balance.lastFetched && !balance.loading && !balance.error && (
        <p className="mt-2 text-xs text-white/30">
          Last updated: {balance.lastFetched.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
