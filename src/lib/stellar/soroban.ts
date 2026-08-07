/**
 * Soroban smart contract helpers — deploy, invoke, events.
 */
import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "./network";
import { signTx } from "../wallets/walletKit";

const rpcServer = new StellarSdk.rpc.Server(STELLAR_NETWORK.sorobanRpcUrl);
const horizonServer = new StellarSdk.Horizon.Server(STELLAR_NETWORK.horizonUrl);

export interface ContractEventData {
  topic: string;
  value: string;
  contractId: string;
}

// ---- Read (simulate only) ----

export async function simulateContractCall(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string,
): Promise<{ resultValue?: string }> {
  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);
  const op = contract.call(functionName, ...args);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResponse = await rpcServer.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Contract simulation failed: ${simResponse.error}`);
  }

  let resultValue: string | undefined;
  if (simResponse.result?.retval) {
    resultValue = StellarSdk.scValToNative(simResponse.result.retval)?.toString();
  }
  return { resultValue };
}

// ---- Write (simulate + sign + submit) ----

export async function callContractFunction(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string,
): Promise<{ hash: string; resultValue?: string; events?: ContractEventData[] }> {
  const contract = new StellarSdk.Contract(contractId);
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);
  const feeStats = await horizonServer.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));
  const op = contract.call(functionName, ...args);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: STELLAR_NETWORK.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResponse = await rpcServer.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Contract simulation failed: ${simResponse.error}`);
  }

  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResponse);
  const assembled = preparedTx as unknown as { built: { toXDR: () => string } };
  const xdr = assembled.built.toXDR();
  const signedXdr = await signTx(xdr, signerPublicKey);
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_NETWORK.networkPassphrase,
  );

  const response = await rpcServer.sendTransaction(signedTx);
  if (response.status === "ERROR") {
    const errResp = response as unknown as { errorResult?: unknown };
    throw new Error(`Contract call failed: ${JSON.stringify(errResp.errorResult || response)}`);
  }

  let getTxResponse = await rpcServer.getTransaction(response.hash);
  let attempts = 0;
  while (
    getTxResponse.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getTxResponse = await rpcServer.getTransaction(response.hash);
    attempts++;
  }

  let resultValue: string | undefined;
  let events: ContractEventData[] = [];
  if (getTxResponse.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    if (getTxResponse.returnValue) {
      resultValue = StellarSdk.scValToNative(getTxResponse.returnValue)?.toString();
    }
    if (getTxResponse.resultMetaXdr) {
      events = extractEvents(getTxResponse.resultMetaXdr, contractId);
    }
  }
  return { hash: response.hash, resultValue, events };
}

// ---- Events ----

export async function fetchContractEvents(
  contractId: string,
  startLedger: number,
): Promise<{ events: ContractEventData[]; latestLedger: number }> {
  try {
    const response = await rpcServer.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [contractId], topics: [["*"]] }],
      limit: 10,
    });
    const events: ContractEventData[] = [];
    let latestLedger = startLedger;
    if (response.events) {
      for (const event of response.events) {
        try {
          const topic = event.topic.map((t: unknown) => String(t)).join(":") || "unknown";
          const rawValue = (event as unknown as { value: string }).value;
          const value = rawValue
            ? StellarSdk.scValToNative(
                StellarSdk.xdr.ScVal.fromXDR(rawValue, "base64"),
              )?.toString() || ""
            : "";
          events.push({ topic, value, contractId });
        } catch {
          /* skip */
        }
        if (event.ledger > latestLedger) latestLedger = event.ledger;
      }
    }
    return { events, latestLedger };
  } catch {
    return { events: [], latestLedger: startLedger };
  }
}

export async function getLatestLedger(): Promise<number> {
  try {
    const health = await rpcServer.getLatestLedger();
    return health.sequence;
  } catch {
    return 0;
  }
}

// ---- Helpers ----

function extractEvents(
  meta: StellarSdk.xdr.TransactionMeta,
  contractId: string,
): ContractEventData[] {
  try {
    const events: ContractEventData[] = [];
    const v3 = meta.v3();
    if (!v3) return events;
    const sorobanMeta = v3.sorobanMeta();
    if (!sorobanMeta?.events()) return events;

    for (const event of sorobanMeta.events()) {
      try {
        const rawContractId = event.contractId();
        if (!rawContractId) continue;
        const evtContractId = StellarSdk.StrKey.encodeContract(rawContractId);
        if (evtContractId !== contractId) continue;

        const topic =
          event
            .body()
            .v0()
            .topics()
            .map((t: StellarSdk.xdr.ScVal) => {
              try {
                return StellarSdk.scValToNative(t)?.toString() || "?";
              } catch {
                return "?";
              }
            })
            .join(":") || "unknown";

        const value = event.body().v0().data()
          ? StellarSdk.scValToNative(event.body().v0().data())?.toString() || ""
          : "";

        events.push({ topic, value, contractId: evtContractId });
      } catch {
        /* skip */
      }
    }
    return events;
  } catch {
    return [];
  }
}
