/**
 * Frontend API client — all requests go through our backend API.
 * The backend handles rate limiting, validation, logging, and routing to Stellar services.
 */

const BASE_URL = "";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const retryAfter = res.headers.get("Retry-After");
    const error = new Error(json.error || `HTTP ${res.status}`) as Error & { retryAfter?: number };
    if (retryAfter) error.retryAfter = parseInt(retryAfter, 10);
    throw error;
  }

  return json as T;
}

// ---- Wallet ----

export function connectWallet(address: string, walletId: string, walletName: string) {
  return request<{ success: boolean; session: { address: string; walletId: string } }>(
    "/api/wallet/connect",
    { method: "POST", body: JSON.stringify({ address, walletId, walletName }) }
  );
}

// ---- Balance ----

export function fetchBalance(address: string) {
  return request<{ xlm: string; raw: string; assets: Array<{ code: string; balance: string; formatted: string }> }>(
    `/api/balance/${encodeURIComponent(address)}`
  );
}

// ---- Faucet ----

export function requestFaucet(address: string) {
  return request<{ success: boolean; hash: string; newBalance: string }>(
    "/api/faucet/fund",
    { method: "POST", body: JSON.stringify({ address }) }
  );
}

// ---- Payments ----

export function buildPayment(
  senderAddress: string,
  destination: string,
  amount: string,
  assetCode?: string
) {
  return request<{ xdr: string }>(
    "/api/payment/send",
    { method: "POST", body: JSON.stringify({ senderAddress, destination, amount, assetCode }) }
  );
}

export function submitPayment(
  signedXdr: string,
  senderAddress: string,
  destination: string,
  amount: string,
  assetCode?: string
) {
  return request<{ success: boolean; hash: string }>(
    "/api/payment/send",
    { method: "POST", body: JSON.stringify({ signedXdr, senderAddress, destination, amount, assetCode }) }
  );
}

// ---- Contract ----

export function simulateContract(
  contractId: string,
  functionName: string,
  args: unknown[],
  signerAddress: string
) {
  return request<{ resultValue?: string }>(
    "/api/contract/invoke",
    { method: "POST", body: JSON.stringify({ contractId, functionName, args, signerAddress, simulate: true }) }
  );
}

export function buildContractCall(
  contractId: string,
  functionName: string,
  args: unknown[],
  signerAddress: string
) {
  return request<{ xdr: string }>(
    "/api/contract/invoke",
    { method: "POST", body: JSON.stringify({ contractId, functionName, args, signerAddress }) }
  );
}

export function submitContract(
  signedXdr: string,
  contractId: string,
  functionName: string,
  signerAddress: string
) {
  return request<{ success: boolean; hash: string; resultValue?: string }>(
    "/api/contract/invoke",
    { method: "POST", body: JSON.stringify({ signedXdr, contractId, functionName, signerAddress }) }
  );
}

// ---- History ----

export function fetchHistory(address?: string, type?: string, limit?: number) {
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (type) params.set("type", type);
  if (limit) params.set("limit", String(limit));
  return request<{ transactions: Array<{
    id: string; type: string; status: string; hash: string | null;
    amount: string; assetCode?: string; senderAddress: string; destinationAddress: string;
    functionName?: string; contractId?: string; errorMessage?: string; timestamp: number;
  }>; total: number }>(`/api/history?${params.toString()}`);
}

// ---- Analytics ----

export function fetchAnalytics(type?: string, summary?: boolean) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (summary) params.set("summary", "true");
  return request<{ events?: Array<{ eventType: string; address: string; timestamp: number; data?: Record<string, unknown> }>;
    summary?: Record<string, { total: number; uniqueAddresses: number }>; total?: number }>(
    `/api/analytics?${params.toString()}`
  );
}
