"use client";

import WalletCard from "@/components/WalletCard";
import BalanceCard from "@/components/BalanceCard";
import FaucetButton from "@/components/FaucetButton";
import SendForm from "@/components/SendForm";
import TransactionHistory from "@/components/TransactionHistory";
import NetworkWarning from "@/components/NetworkWarning";
import { useAppContext } from "@/context/AppContext";

export default function Home() {
  const { state } = useAppContext();
  const { wallet } = state;

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
          One click. Instant testnet funds. Built for Stellar developers who
          need fast, repeatable access to test XLM without leaving the browser.
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
      )}

      {/* Empty state when not connected */}
      {!wallet.connected && (
        <div className="text-center max-w-md mx-auto space-y-10">
          {/* Feature teasers */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "💧", label: "Faucet", desc: "Get 10,000 test XLM" },
              { icon: "📤", label: "Send", desc: "Transfer to any address" },
              { icon: "📊", label: "Balance", desc: "Real-time balance" },
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
              Connect your Freighter wallet to get started with StellarDripz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
