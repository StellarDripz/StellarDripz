// --- Wallet Types ---

export type NetworkType = "TESTNET" | "MAINNET" | "UNKNOWN";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: NetworkType;
  isFreighterInstalled: boolean;
}

// --- Balance Types ---

export interface BalanceInfo {
  xlm: string;
  raw: string;
  lastFetched: Date | null;
}

// --- Transaction Types ---

export type TxStatus = "idle" | "pending" | "success" | "error";

export type TxType = "faucet" | "send";

export interface TransactionRecord {
  id: string;
  type: TxType;
  status: TxStatus;
  hash: string | null;
  amount: string;
  destination: string;
  timestamp: Date;
  errorMessage?: string;
  explorerUrl?: string;
}

// --- App State ---

export interface AppState {
  wallet: WalletState;
  balance: BalanceInfo & { loading: boolean; error: string | null };
  transactions: TransactionRecord[];
  txInProgress: TxStatus;
}
