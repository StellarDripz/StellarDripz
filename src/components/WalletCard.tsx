"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";

export default function WalletCard() {
  const { state, connect, disconnect } = useAppContext();
  const { wallet } = state;
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
    } finally {
      setConnecting(false);
    }
  };

  // Not installed state
  if (!wallet.isFreighterInstalled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stellar-blue/10">
          <span className="text-3xl">🦊</span>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Freighter Wallet Required
        </h2>
        <p className="mb-4 text-sm text-white/60 max-w-xs mx-auto">
          StellarDripz requires the Freighter browser extension to interact with
          the Stellar network.
        </p>
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-stellar-blue px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-stellar-blue-light hover:shadow-lg hover:shadow-stellar-blue/25 active:scale-95"
        >
          Install Freighter
          <span className="text-xs">↗</span>
        </a>
      </div>
    );
  }

  // Connected state
  if (wallet.connected && wallet.publicKey) {
    return (
      <div className="rounded-2xl border border-stellar-green/20 bg-surface-800/60 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stellar-green/10">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stellar-green opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-stellar-green" />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connected</p>
              <p className="font-mono text-xs text-stellar-green truncate max-w-[200px]">
                {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-6)}
              </p>
            </div>
          </div>
          <button
            onClick={disconnect}
            className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/40 active:scale-95"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stellar-blue/10">
        <svg
          className="h-8 w-8 text-stellar-blue"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Connect Your Wallet
      </h2>
      <p className="mb-4 text-sm text-white/60 max-w-xs mx-auto">
        Link your Freighter wallet to request testnet XLM and send transactions.
      </p>
      {error && (
        <p className="mb-3 text-sm text-red-400 bg-red-500/5 rounded-lg py-2 px-3 border border-red-500/20">
          {error === "FREIGHTER_NOT_INSTALLED"
            ? "Freighter is not installed."
            : error === "FREIGHTER_LOCKED"
            ? "Freighter is locked. Please unlock it."
            : error === "USER_REJECTED"
            ? "Connection was rejected."
            : error === "CONNECTION_FAILED"
            ? "Could not connect to Freighter."
            : error === "NO_ACCOUNT"
            ? "No Stellar account found in Freighter."
            : error}
        </p>
      )}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-stellar-blue to-stellar-purple px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-stellar-blue/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connecting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
              />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
    </div>
  );
}
