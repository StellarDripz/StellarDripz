"use client";

import { useState } from "react";
import WalletCard from "@/components/WalletCard";
import BalanceCard from "@/components/BalanceCard";
import FaucetButton from "@/components/FaucetButton";
import SendForm from "@/components/SendForm";
import TransactionHistory from "@/components/TransactionHistory";
import NetworkWarning from "@/components/NetworkWarning";
import ContractInteraction from "@/components/ContractInteraction";
import TxStatusTracker from "@/components/TxStatusTracker";
import { useAppContext } from "@/context/AppContext";

export default function Home() {
  const { state } = useAppContext();
  const { wallet } = state;
  const [contractIdInput, setContractIdInput] = useState("");
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  const handleSetContractId = () => {
    const trimmed = contractIdInput.trim();
    if (trimmed) {
      setActiveContractId(trimmed);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border border-stellar-blue/20 bg-stellar-blue/5 px-4 py-1.5 text-xs font-medium text-stellar-blue mb-6">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stellar-blue opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-stellar-blue" />
          </span>
          Stellar Testnet
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Drip{" "}
          <span className="text-gradient">Testnet XLM</span>
        </h2>
        <p className="mt-4 text-lg text-white/50 leading-relaxed max-w-lg mx-auto">
          Multi-wallet faucet with smart contract support. Get testnet funds, send
          transactions, and interact with Soroban contracts — all in one place.
        </p>
      </div>

      {/* Network Warning */}
      <NetworkWarning />

      {/* Wallet Card — always visible */}
      <div className="max-w-md mx-auto">
        <WalletCard />
      </div>

      {/* Connected-only sections */}
      {wallet.connected && (
        <>
          {/* TX Status Tracker */}
          <div className="max-w-2xl mx-auto">
            <TxStatusTracker />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <BalanceCard />
              <FaucetButton />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <SendForm />
              <TransactionHistory />
            </div>
          </div>

          {/* Smart Contract Section */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
                Smart Contracts
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Contract ID Input */}
            {!activeContractId && (
              <div className="rounded-2xl border border-dashed border-stellar-purple/20 bg-surface-800/40 p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={contractIdInput}
                    onChange={(e) => setContractIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetContractId()}
                    placeholder="Paste deployed contract ID (C...)..."
                    className="flex-1 rounded-xl border border-white/10 bg-surface-950 px-4 py-2.5 font-mono text-xs text-white placeholder-white/30 focus:border-stellar-purple/50 focus:outline-none"
                  />
                  <button
                    onClick={handleSetContractId}
                    disabled={!contractIdInput.trim()}
                    className="rounded-xl bg-gradient-to-r from-stellar-purple to-stellar-blue px-5 py-2.5 text-xs font-semibold text-white transition-all hover:shadow-lg hover:shadow-stellar-purple/25 active:scale-95 disabled:opacity-30"
                  >
                    Connect
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-white/25 text-center">
                  Deploy the StellarDripz Counter contract using the deploy
                  script at{" "}
                  <code className="text-stellar-purple/60">
                    scripts/deploy-contract.ts
                  </code>
                </p>
              </div>
            )}

            {activeContractId && (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setActiveContractId(null);
                    setContractIdInput("");
                  }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                >
                  Disconnect Contract
                </button>
              </div>
            )}

            <ContractInteraction contractId={activeContractId} />
          </div>
        </>
      )}

      {/* Empty state when not connected */}
      {!wallet.connected && (
        <div className="text-center max-w-md mx-auto space-y-10">
          {/* Feature teasers */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "💧", label: "Faucet", desc: "Get 10,000 test XLM" },
              { icon: "📤", label: "Send", desc: "Transfer to any address" },
              { icon: "📊", label: "Multi-Asset", desc: "Track all balances" },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center transition-all hover:border-white/10"
              >
                <span className="text-2xl">{f.icon}</span>
                <p className="mt-2 text-xs font-semibold text-white/60">
                  {f.label}
                </p>
                <p className="text-[10px] text-white/30">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-surface-800/30 p-6">
            <p className="text-sm text-white/40">
              Connect any Stellar wallet (Freighter, xBull, Albedo, LOBSTR) to
              get started with StellarDripz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
