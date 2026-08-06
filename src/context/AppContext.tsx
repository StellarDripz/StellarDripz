"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import type {
  AppState,
  WalletState,
  BalanceInfo,
  TransactionRecord,
  TxStatus,
  ContractEvent,
} from "@/types";
import {
  connectWithWallet,
  clearPersistedWallet,
  checkAnyWalletInstalled,
  getSupportedWallets,
  loadPersistedWallet,
  resetKit,
} from "@/services/walletService";
import { fetchBalance } from "@/services/balanceService";
import {
  requestFaucetFunds,
  sendPayment,
  getExplorerUrl,
} from "@/services/transactionService";

// --- Actions ---

type Action =
  | { type: "SET_WALLET"; payload: Partial<WalletState> }
  | { type: "SET_BALANCE"; payload: Partial<BalanceInfo & { loading: boolean; error: string | null }> }
  | { type: "SET_BALANCE_LOADING"; payload: boolean }
  | { type: "SET_BALANCE_ERROR"; payload: string | null }
  | { type: "ADD_TRANSACTION"; payload: TransactionRecord }
  | { type: "UPDATE_TRANSACTION"; payload: TransactionRecord }
  | { type: "SET_TX_IN_PROGRESS"; payload: TxStatus }
  | { type: "ADD_CONTRACT_EVENT"; payload: ContractEvent }
  | { type: "CLEAR_CONTRACT_EVENTS" }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_WALLET":
      return { ...state, wallet: { ...state.wallet, ...action.payload } };
    case "SET_BALANCE":
      return { ...state, balance: { ...state.balance, ...action.payload } };
    case "SET_BALANCE_LOADING":
      return { ...state, balance: { ...state.balance, loading: action.payload } };
    case "SET_BALANCE_ERROR":
      return { ...state, balance: { ...state.balance, loading: false, error: action.payload } };
    case "ADD_TRANSACTION":
      return { ...state, transactions: [action.payload, ...state.transactions].slice(0, 50) };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "SET_TX_IN_PROGRESS":
      return { ...state, txInProgress: action.payload };
    case "ADD_CONTRACT_EVENT":
      return { ...state, contractEvents: [action.payload, ...state.contractEvents].slice(0, 50) };
    case "CLEAR_CONTRACT_EVENTS":
      return { ...state, contractEvents: [] };
    case "RESET":
      return {
        ...initialState,
        wallet: {
          ...initialState.wallet,
          isAnyWalletInstalled: state.wallet.isAnyWalletInstalled,
          availableWallets: state.wallet.availableWallets,
        },
      };
    default:
      return state;
  }
}

const initialState: AppState = {
  wallet: {
    connected: false,
    publicKey: null,
    network: "UNKNOWN",
    walletId: null,
    walletName: null,
    isAnyWalletInstalled: false,
    availableWallets: [],
  },
  balance: {
    xlm: "0.0000000",
    raw: "0",
    assets: [],
    lastFetched: null,
    loading: false,
    error: null,
  },
  transactions: [],
  txInProgress: "idle",
  contractEvents: [],
};

// --- Context ---

interface AppContextValue {
  state: AppState;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  doFaucetRequest: () => Promise<void>;
  doSendPayment: (destination: string, amount: string, assetCode?: string) => Promise<void>;
  addContractEvent: (event: ContractEvent) => void;
  clearContractEvents: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Check available wallets on mount
  useEffect(() => {
    const installed = checkAnyWalletInstalled();
    const wallets = getSupportedWallets();
    dispatch({
      type: "SET_WALLET",
      payload: { isAnyWalletInstalled: installed, availableWallets: wallets },
    });

    // Auto-reconnect from persisted state
    const persisted = loadPersistedWallet();
    if (persisted) {
      (async () => {
        try {
          // Reconnect using the persisted wallet
          const result = await connectWithWallet(persisted.walletId);
          dispatch({
            type: "SET_WALLET",
            payload: {
              connected: true,
              publicKey: result.publicKey,
              network: result.network,
              walletId: result.walletId,
              walletName: result.walletName,
            },
          });
        } catch {
          // Stale persisted state — ignore, clear it
          clearPersistedWallet();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (state.wallet.connected && state.wallet.publicKey) {
      refreshBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wallet.connected, state.wallet.publicKey]);

  const connect = useCallback(async (walletId: string) => {
    dispatch({ type: "SET_WALLET", payload: { connected: false } });
    const { publicKey, network, walletId: wid, walletName } = await connectWithWallet(walletId);
    dispatch({
      type: "SET_WALLET",
      payload: { connected: true, publicKey, network, walletId: wid, walletName },
    });
  }, []);

  const disconnect = useCallback(() => {
    clearPersistedWallet();
    resetKit();
    dispatch({ type: "RESET" });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.wallet.publicKey) return;
    dispatch({ type: "SET_BALANCE_LOADING", payload: true });
    dispatch({ type: "SET_BALANCE_ERROR", payload: null });
    try {
      const info = await fetchBalance(state.wallet.publicKey);
      dispatch({
        type: "SET_BALANCE",
        payload: { ...info, loading: false, error: null },
      });
    } catch (err) {
      dispatch({
        type: "SET_BALANCE_ERROR",
        payload: err instanceof Error ? err.message : "Failed to fetch balance",
      });
    }
  }, [state.wallet.publicKey]);

  const doFaucetRequest = useCallback(async () => {
    if (!state.wallet.publicKey) return;

    const txId = `faucet-${Date.now()}`;
    const pendingTx: TransactionRecord = {
      id: txId,
      type: "faucet",
      status: "pending",
      hash: null,
      amount: "10,000",
      destination: state.wallet.publicKey,
      timestamp: new Date(),
    };

    dispatch({ type: "ADD_TRANSACTION", payload: pendingTx });
    dispatch({ type: "SET_TX_IN_PROGRESS", payload: "pending" });

    try {
      const { hash } = await requestFaucetFunds(state.wallet.publicKey);

      const successTx: TransactionRecord = {
        ...pendingTx,
        status: "success",
        hash,
        explorerUrl:
          hash && !hash.startsWith("faucet-")
            ? getExplorerUrl(hash)
            : undefined,
      };

      dispatch({ type: "UPDATE_TRANSACTION", payload: successTx });
      dispatch({ type: "SET_TX_IN_PROGRESS", payload: "success" });
      await refreshBalance();
    } catch (err) {
      const errorTx: TransactionRecord = {
        ...pendingTx,
        status: "error",
        errorMessage:
          err instanceof Error ? err.message : "Faucet request failed",
      };
      dispatch({ type: "UPDATE_TRANSACTION", payload: errorTx });
      dispatch({ type: "SET_TX_IN_PROGRESS", payload: "error" });
    }
  }, [state.wallet.publicKey, refreshBalance]);

  const doSendPayment = useCallback(
    async (destination: string, amount: string, assetCode?: string) => {
      if (!state.wallet.publicKey) return;

      let asset: import("@/types").StellarAsset | undefined;
      if (assetCode && assetCode !== "XLM") {
        const found = state.balance.assets.find(
          (a) => a.asset.code === assetCode
        );
        if (!found) {
          throw new Error(
            `Asset "${assetCode}" not found in your balance.`
          );
        }
        asset = found.asset;
      }

      const txId = `send-${Date.now()}`;
      const pendingTx: TransactionRecord = {
        id: txId,
        type: "send",
        status: "pending",
        hash: null,
        amount,
        destination,
        assetCode: assetCode || "XLM",
        timestamp: new Date(),
      };

      dispatch({ type: "ADD_TRANSACTION", payload: pendingTx });
      dispatch({ type: "SET_TX_IN_PROGRESS", payload: "pending" });

      try {
        const { hash } = await sendPayment(
          state.wallet.publicKey,
          destination,
          amount,
          asset
        );

        const successTx: TransactionRecord = {
          ...pendingTx,
          status: "success",
          hash,
          explorerUrl: getExplorerUrl(hash),
        };
        dispatch({ type: "UPDATE_TRANSACTION", payload: successTx });
        dispatch({ type: "SET_TX_IN_PROGRESS", payload: "success" });
        await refreshBalance();
      } catch (err) {
        const errorTx: TransactionRecord = {
          ...pendingTx,
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "Transaction failed",
        };
        dispatch({ type: "UPDATE_TRANSACTION", payload: errorTx });
        dispatch({ type: "SET_TX_IN_PROGRESS", payload: "error" });
      }
    },
    [state.wallet.publicKey, state.balance.assets, refreshBalance]
  );

  const addContractEvent = useCallback((event: ContractEvent) => {
    dispatch({ type: "ADD_CONTRACT_EVENT", payload: event });
  }, []);

  const clearContractEvents = useCallback(() => {
    dispatch({ type: "CLEAR_CONTRACT_EVENTS" });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        connect,
        disconnect,
        refreshBalance,
        doFaucetRequest,
        doSendPayment,
        addContractEvent,
        clearContractEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return ctx;
}
