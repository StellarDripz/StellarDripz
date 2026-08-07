/**
 * Wallet client — registers wallet sessions with the backend API.
 * Used by AppContext after successful wallet connection.
 */
import { request } from "./apiClient";

export interface WalletRegistration {
  success: boolean;
  session: {
    address: string;
    walletId: string;
    connectedAt: number;
  };
}

/**
 * Register a newly connected wallet with the backend for session tracking.
 */
export async function connectAndRegister(
  address: string,
  walletId: string,
  walletName: string,
): Promise<WalletRegistration> {
  return request<WalletRegistration>("/api/wallet/connect", {
    method: "POST",
    body: JSON.stringify({ address, walletId, walletName }),
  });
}
