"use client";

import { useAppContext } from "@/context/AppContext";
import { showToast } from "./Toast";
import { useEffect, useRef } from "react";

export default function FaucetButton() {
  const { state, doFaucetRequest } = useAppContext();
  const { wallet, txInProgress } = state;
  const prevTxRef = useRef(txInProgress);

  if (!wallet.connected) return null;

  const isPending = txInProgress === "pending";
  const isOnMainnet = wallet.network === "MAINNET";

  // Show toast on tx status change
  useEffect(() => {
    if (prevTxRef.current === "pending" && txInProgress === "success") {
      showToast({
        type: "success",
        title: "Faucet request successful!",
        message: "10,000 XLM sent to your wallet.",
      });
    }
    if (prevTxRef.current === "pending" && txInProgress === "error") {
      showToast({
        type: "error",
        title: "Faucet request failed",
        message: "Check the transaction log for details.",
      });
    }
    prevTxRef.current = txInProgress;
  }, [txInProgress]);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stellar-purple/10">
          <span className="text-xl">💧</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Testnet Faucet</h3>
          <p className="text-xs text-white/50">
            Get 10,000 testnet XLM with one click
          </p>
        </div>
      </div>

      <button
        onClick={doFaucetRequest}
        disabled={isPending || isOnMainnet}
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
          isPending
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed"
            : isOnMainnet
            ? "bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed"
            : "bg-gradient-to-r from-stellar-purple to-stellar-blue text-white hover:shadow-lg hover:shadow-stellar-purple/20"
        }`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
            Requesting...
          </span>
        ) : isOnMainnet ? (
          "Switch to Testnet to use Faucet"
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">💧</span>
            Request 10,000 XLM
          </span>
        )}
      </button>

      <p className="mt-3 text-center text-[11px] text-white/30">
        Powered by Stellar Friendbot
      </p>
    </div>
  );
}
