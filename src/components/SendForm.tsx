"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import * as StellarSdk from "@stellar/stellar-sdk";
import QrModal from "./QrModal";

export default function SendForm() {
  const { state, doSendPayment } = useAppContext();
  const { wallet, txInProgress } = state;

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [destError, setDestError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [showPaymentQr, setShowPaymentQr] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("XLM");

  if (!wallet.connected) return null;

  const isPending = txInProgress === "pending";
  const isOnMainnet = wallet.network === "MAINNET";

  const validateDestination = (val: string) => {
    setDestination(val);
    if (!val.trim()) {
      setDestError("");
      return;
    }
    try {
      StellarSdk.StrKey.decodeEd25519PublicKey(val.trim());
      setDestError("");
    } catch {
      setDestError("Invalid Stellar address");
    }
  };

  const validateAmount = (val: string) => {
    setAmount(val);
    if (!val.trim()) {
      setAmountError("");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setAmountError("Must be a positive number");
    } else {
      setAmountError("");
    }
  };

  const handleSend = async () => {
    let valid = true;
    if (!destination.trim() || destError) {
      setDestError("Valid destination required");
      valid = false;
    }
    if (!amount.trim() || amountError) {
      setAmountError("Valid amount required");
      valid = false;
    }
    if (!valid) return;

    const assetCode = selectedAsset !== "XLM" ? selectedAsset : undefined;
    await doSendPayment(destination.trim(), amount.trim(), assetCode);
    setDestination("");
    setAmount("");
  };

  const hasValidPaymentInfo =
    destination.trim() && !destError && amount.trim() && !amountError;

  return (
    <>
      {hasValidPaymentInfo && (
        <QrModal
          open={showPaymentQr}
          onClose={() => setShowPaymentQr(false)}
          address={destination.trim()}
          amount={amount.trim()}
          label="Payment Request"
        />
      )}
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stellar-blue/10">
          <span className="text-xl">📤</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Send</h3>
          <p className="text-xs text-white/50">
            Transfer assets to another address
          </p>
        </div>
      </div>

      {isOnMainnet && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          ⚠️ Cannot send on Mainnet. Switch to Testnet.
        </div>
      )}

      <div className="space-y-3">
        {/* Destination */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Recipient Address
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => validateDestination(e.target.value)}
            placeholder="G..."
            disabled={isPending || isOnMainnet}
            className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 transition-all focus:outline-none focus:ring-2 ${
              destError
                ? "border-red-500/50 focus:ring-red-500/30"
                : "border-white/10 focus:border-stellar-blue/50 focus:ring-stellar-blue/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {destError && (
            <p className="mt-1 text-xs text-red-400">{destError}</p>
          )}
        </div>

        {/* Amount */}
        {/* Asset selector */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Asset
          </label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            disabled={isPending || isOnMainnet}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:outline-none focus:ring-2 focus:border-stellar-blue/50 focus:ring-stellar-blue/30 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
          >
            <option value="XLM">XLM (native)</option>
            {state.balance.assets
              .filter((a) => a.asset.type !== "native")
              .map((a) => (
                <option
                  key={`${a.asset.code}-${a.asset.issuer}`}
                  value={a.asset.code}
                >
                  {a.asset.code} ({a.formatted})
                </option>
              ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => validateAmount(e.target.value)}
            placeholder="0.0"
            min="0.0000001"
            step="0.0000001"
            disabled={isPending || isOnMainnet}
            className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/20 transition-all focus:outline-none focus:ring-2 ${
              amountError
                ? "border-red-500/50 focus:ring-red-500/30"
                : "border-white/10 focus:border-stellar-blue/50 focus:ring-stellar-blue/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {amountError && (
            <p className="mt-1 text-xs text-red-400">{amountError}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={isPending || isOnMainnet || !destination || !amount}
            className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
              isPending
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed"
                : "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">📤</span>
                Send XLM
              </span>
            )}
          </button>
          {hasValidPaymentInfo && (
            <button
              type="button"
              onClick={() => setShowPaymentQr(true)}
              disabled={isPending || isOnMainnet}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Generate payment QR"
            >
              📱
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
