"use client";

import { useAppContext } from "@/context/AppContext";

export default function NetworkWarning() {
  const { state } = useAppContext();
  const { wallet } = state;

  if (!wallet.connected || wallet.network === "TESTNET" || wallet.network === "UNKNOWN") {
    return null;
  }

  return (
    <div
      role="alert"
      className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center backdrop-blur-sm"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">⚠️</span>
        <p className="text-sm font-medium text-red-400">
          Your wallet is on <strong>Mainnet</strong>. Please switch to <strong>Testnet</strong> in
          your wallet extension settings.
        </p>
      </div>
    </div>
  );
}
// NetworkWarning: blocks mainnet interactions for testnet-only safety
