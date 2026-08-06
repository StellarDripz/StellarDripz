"use client";
import { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { AppState, WalletState, BalanceInfo, TransactionRecord, TxStatus, ContractEvent, CooldownState } from "@/types/stellar";
import { connectWithWallet, clearPersistedWallet, checkAnyWalletInstalled, getSupportedWallets, loadPersistedWallet, resetKit, signTx } from "@/lib/wallets/walletKit";
import { connectAndRegister } from "@/lib/client/walletClient";
import * as apiClient from "@/lib/client/apiClient";
import { directFetchBalance } from "@/lib/client/directClient";
type Action = { type: "SET_WALLET"; payload: Partial<WalletState> } | { type: "SET_BALANCE"; payload: Partial<BalanceInfo & { loading: boolean; error: string | null }> } | { type: "RESET" };
function reducer(state: AppState, action: Action): AppState { return state; }
const initialState: AppState = { wallet: { connected: false, publicKey: null, network: "UNKNOWN", walletId: null, walletName: null, isAnyWalletInstalled: false, availableWallets: [] }, balance: { xlm: "0", raw: "0", assets: [], lastFetched: null, loading: false, error: null }, transactions: [], txInProgress: "idle", contractEvents: [], cooldown: null };
interface AppContextValue { state: AppState; connect: (id: string) => Promise<void>; disconnect: () => void; refreshBalance: () => Promise<void>; doFaucetRequest: () => Promise<void>; doSendPayment: (d: string, a: string, c?: string) => Promise<void>; addContractEvent: (e: ContractEvent) => void; clearContractEvents: () => void; checkCooldown: () => void; }
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshBalance = useCallback(async () => {}, []);
  return <AppContext.Provider value={{ state, connect: async () => {}, disconnect: () => {}, refreshBalance, doFaucetRequest: async () => {}, doSendPayment: async () => {}, addContractEvent: () => {}, clearContractEvents: () => {}, checkCooldown: () => {} }}>{children}</AppContext.Provider>;
}
export function useAppContext(): AppContextValue { const ctx = useContext(AppContext); if (!ctx) throw new Error("useAppContext must be used within an AppProvider"); return ctx; }
