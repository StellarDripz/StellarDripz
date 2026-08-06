/**
 * Soroban service layer — wraps Soroban RPC for contract interaction.
 */
import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/lib/stellar/network";
import type { TxRecord } from "./dbService";
import { saveTransaction, logAnalytics } from "./dbService";

const sorobanServer = new StellarSdk.rpc.Server(STELLAR_NETWORK.sorobanRpcUrl);
const horizonServer = new StellarSdk.Horizon.Server(STELLAR_NETWORK.horizonUrl);

// ---- Read (simulate only) ----

export async function simulateContractCallServer(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string
): Promise<{ resultValue?: string }> {
  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const simResponse = await sorobanServer.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }

  let resultValue: string | undefined;
  if (simResponse.result?.retval) {
    resultValue = StellarSdk.scValToNative(simResponse.result.retval)?.toString();
  }
  return { resultValue };
}

// ---- Write (build XDR for frontend signing) ----

export async function buildContractInvocation(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string
): Promise<{ xdr: string }> {
  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);
  const feeStats = await horizonServer.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee, networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  return { xdr: tx.toXDR() };
}

// ---- Submit ----

export async function submitContractInvocation(
  signedXdr: string,
  contractId: string,
  functionName: string,
  signerPublicKey: string,
  requestInfo: { ip?: string; userAgent?: string }
): Promise<{ hash: string; resultValue?: string }> {
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, STELLAR_NETWORK.networkPassphrase);

  // Simulate again with signature data
  const simResponse = await sorobanServer.simulateTransaction(signedTx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }

  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(signedTx, simResponse);
  const assembled = preparedTx as unknown as { built: { toXDR: () => string } };
  const finalXdr = assembled.built.toXDR();

  const finalSignedTx = StellarSdk.TransactionBuilder.fromXDR(finalXdr, STELLAR_NETWORK.networkPassphrase);
  const response = await sorobanServer.sendTransaction(finalSignedTx);

  if (response.status === "ERROR") {
    throw new Error(`Contract submission failed: ${JSON.stringify(response)}`);
  }

  // Wait for confirmation
  let getTx = await sorobanServer.getTransaction(response.hash);
  let attempts = 0;
  while (getTx.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    getTx = await sorobanServer.getTransaction(response.hash);
    attempts++;
  }

  let resultValue: string | undefined;
  if (getTx.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS && getTx.returnValue) {
    resultValue = StellarSdk.scValToNative(getTx.returnValue)?.toString();
  }

  // Log
  const txRecord: TxRecord = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: "contract", status: "success", hash: response.hash,
    amount: "0", senderAddress: signerPublicKey, destinationAddress: contractId,
    functionName, contractId, timestamp: Date.now(),
    ip: requestInfo.ip, userAgent: requestInfo.userAgent,
  };
  saveTransaction(txRecord);
  logAnalytics({ eventType: "contract_invoke", address: signerPublicKey, data: { contractId, functionName } });

  return { hash: response.hash, resultValue };
}

// ---- Events ----

export async function getContractEventsServer(
  contractId: string,
  startLedger: number
): Promise<{ events: Array<{ topic: string; value: string }>; latestLedger: number }> {
  try {
    const response = await sorobanServer.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [contractId], topics: [["*"]] }],
      limit: 10,
    });

    const events: Array<{ topic: string; value: string }> = [];
    let latestLedger = startLedger;

    if (response.events) {
      for (const event of response.events) {
        try {
          const topic = event.topic.map((t: unknown) => String(t)).join(":") || "unknown";
          const rawValue = (event as unknown as { value: string }).value;
          const value = rawValue
            ? StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(rawValue, "base64"))?.toString() || ""
            : "";
          events.push({ topic, value });
        } catch { /* skip */ }
        if (event.ledger > latestLedger) latestLedger = event.ledger;
      }
    }
    return { events, latestLedger };
  } catch {
    return { events: [], latestLedger: startLedger };
  }
}
// Validates and normalizes Soroban RPC event responses
