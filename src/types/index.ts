// --- Wallet Types ---

export type NetworkType = "TESTNET" | "MAINNET" | "UNKNOWN";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: NetworkType;
  isFreighterInstalled: boolean;
}

// --- Asset Types ---

export interface StellarAsset {
  code: string;
  issuer: string;
  type: "native" | "credit_alphanum4" | "credit_alphanum12";
}

export interface AssetBalance {
  asset: StellarAsset;
  balance: string;
  formatted: string;
}

// --- Balance Types ---

export interface BalanceInfo {
  xlm: string;
  raw: string;
  lastFetched: Date | null;
  assets: AssetBalance[];
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
  assetCode?: string;
}

// --- App State ---

export interface AppState {
  wallet: WalletState;
  balance: BalanceInfo & { loading: boolean; error: string | null };
  transactions: TransactionRecord[];
  txInProgress: TxStatus;
}
