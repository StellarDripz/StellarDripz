/**
 * Frontend wallet client — talks to backend /api/wallet/connect
 * Also handles signing locally (Freighter/xBull/Albedo).
 */
import { connectWallet } from "./apiClient";
import { signTx as signTxLib } from "@/lib/wallets/walletKit";

export async function connectAndRegister(
  publicKey: string,
  walletId: string,
  walletName: string,
): Promise<void> {
  await connectWallet(publicKey, walletId, walletName);
}

export { signTxLib as signTx };
