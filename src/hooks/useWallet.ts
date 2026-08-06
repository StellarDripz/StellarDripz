"use client";
import { useState, useCallback, useEffect } from "react";
import type { WalletState } from "@/types/stellar";

interface UseWalletReturn {
  wallet: WalletState;
  connecting: boolean;
  error: string | null;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  refreshWallets: () => void;
}

export function useWallet(): UseWalletReturn {
  return { wallet: {} as WalletState, connecting: false, error: null, connect: async () => {}, disconnect: () => {}, refreshWallets: () => {} };
}
