"use client";

import React, {
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
} from "@/types";
import {
  connectWallet,
  clearPersistedWallet,
  checkFreighterInstalled,
  detectFreighterNetwork,
  loadPersistedWallet,
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
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_WALLET":
      return { ...state, wallet: { ...state.wallet, ...action.payload } };
    case "SET_BALANCE":
      return {
        ...state,
        balance: {
          ...state.balance,
          ...action.payload,
        },
      };
    case "SET_BALANCE_LOADING":
      return { ...state, balance: { ...state.balance, loading: action.payload } };
    case "SET_BALANCE_ERROR":
      return {
        ...state,
        balance: { ...state.balance, loading: false, error: action.payload },
      };
    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: [action.payload, ...state.transactions].slice(0, 20),
      };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "SET_TX_IN_PROGRESS":
      return { ...state, txInProgress: action.payload };
    case "RESET":
      return { ...initialState, wallet: { ...initialState.wallet, isFreighterInstalled: state.wallet.isFreighterInstalled } };
    default:
      return state;
  }
}

const initialState: AppState = {
  wallet: {
    connected: false,
    publicKey: null,
    network: "UNKNOWN",
    isFreighterInstalled: false,
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
};

// --- Context ---

interface AppContextValue {
  state: AppState;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  doFaucetRequest: () => Promise<void>;
  doSendPayment: (destination: string, amount: string, assetCode?: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Check Freighter on mount
  useEffect(() => {
    const installed = checkFreighterInstalled();
    dispatch({
      type: "SET_WALLET",
      payload: { isFreighterInstalled: installed },
    });

    // Attempt to reconnect from persisted state
    const persisted = loadPersistedWallet();
    if (persisted) {
      (async () => {
        try {
          const network = await detectFreighterNetwork();
          dispatch({
            type: "SET_WALLET",
            payload: {
              connected: true,
              publicKey: persisted.publicKey,
              network,
            },
          });
        } catch {
          // Persisted state is stale — ignore
        }
      })();
    }
  }, []);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (state.wallet.connected && state.wallet.publicKey) {
      refreshBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wallet.connected, state.wallet.publicKey]);

  const connect = useCallback(async () => {
    dispatch({ type: "SET_WALLET", payload: { connected: false } });
    const { publicKey, network } = await connectWallet();
    dispatch({
      type: "SET_WALLET",
      payload: { connected: true, publicKey, network },
    });
  }, []);

  const disconnect = useCallback(() => {
    clearPersistedWallet();
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
      const { hash, newBalance } = await requestFaucetFunds(
        state.wallet.publicKey
      );

      const successTx: TransactionRecord = {
        ...pendingTx,
        status: "success",
        hash,
        explorerUrl: hash.startsWith("faucet-")
          ? undefined
          : getExplorerUrl(hash),
      };

      dispatch({ type: "UPDATE_TRANSACTION", payload: successTx });
      dispatch({ type: "SET_TX_IN_PROGRESS", payload: "success" });

      // Update balance
      dispatch({
        type: "SET_BALANCE",
        payload: {
          xlm: newBalance,
          raw: newBalance,
          lastFetched: new Date(),
          loading: false,
          error: null,
        },
      });
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
  }, [state.wallet.publicKey]);

  const doSendPayment = useCallback(
    async (destination: string, amount: string, assetCode?: string) => {
      if (!state.wallet.publicKey) return;

      // Resolve asset from balance if an asset code is given
      let asset: import("@/types").StellarAsset | undefined;
      if (assetCode && assetCode !== "XLM") {
        const found = state.balance.assets.find(
          (a) => a.asset.code === assetCode
        );
        if (found) {
          asset = found.asset;
        }
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

        // Refresh balance
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

  return (
    <AppContext.Provider
      value={{
        state,
        connect,
        disconnect,
        refreshBalance,
        doFaucetRequest,
        doSendPayment,
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
