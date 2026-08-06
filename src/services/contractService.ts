/**
 * Soroban smart contract service.
 * Handles contract function invocation and event queries
 * via Stellar's Soroban RPC.
 */
import * as StellarSdk from "@stellar/stellar-sdk";
import { signTx } from "./walletService";
import { STELLAR_CONFIG } from "@/config";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";

const server = new StellarSdk.rpc.Server(RPC_URL);
const horizonServer = new StellarSdk.Horizon.Server(
  STELLAR_CONFIG.horizonUrl
);

// --- Contract Event Data ---

export interface ContractEventData {
  topic: string;
  value: string;
  contractId: string;
}

// --- Read-Only Call (simulate only, no wallet signing) ---

/**
 * Call a read-only contract function (no auth required).
 * Uses simulateTransaction which returns the result directly.
 */
export async function simulateContractCall(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string
): Promise<{ resultValue?: string }> {
  const contract = new StellarSdk.Contract(contractId);

  // Load account for simulation context
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);

  // Build operation
  const op = contract.call(functionName, ...args);

  // Build a transaction just for simulation
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResponse = await server.simulateTransaction(tx);

  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Contract simulation failed: ${simResponse.error}`);
  }

  let resultValue: string | undefined;
  if (simResponse.result?.retval) {
    resultValue = StellarSdk.scValToNative(
      simResponse.result.retval
    )?.toString();
  }

  return { resultValue };
}

// --- Write Call (simulate + sign + submit) ---

/**
 * Call a contract function that requires auth (write).
 * Simulates, signs via wallet, submits, and waits for confirmation.
 */
export async function callContractFunction(
  contractId: string,
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string
): Promise<{ hash: string; resultValue?: string; events?: ContractEventData[] }> {
  const contract = new StellarSdk.Contract(contractId);

  // Load account
  const sourceAccount = await horizonServer.loadAccount(signerPublicKey);

  // Fetch dynamic fee
  const feeStats = await horizonServer.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));

  // Build operation
  const op = contract.call(functionName, ...args);

  // Build transaction
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  // Simulate first (required for Soroban)
  const simResponse = await server.simulateTransaction(tx);

  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Contract simulation failed: ${simResponse.error}`);
  }

  // Prepare transaction with simulation data
  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(
    tx,
    simResponse
  );

  // Get XDR from assembled transaction's built property
  const assembled = preparedTx as unknown as {
    built: { toXDR: () => string };
  };
  const xdr = assembled.built.toXDR();

  // Sign via wallet
  const signedXdr = await signTx(xdr, signerPublicKey);
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_CONFIG.networkPassphrase
  );

  // Submit
  const response = await server.sendTransaction(signedTx);

  if (response.status === "ERROR") {
    const errResp = response as unknown as { errorResult?: unknown };
    throw new Error(`Contract call failed: ${JSON.stringify(errResp.errorResult || response)}`);
  }

  // Wait for confirmation
  let getTxResponse = await server.getTransaction(response.hash);
  let attempts = 0;
  while (
    getTxResponse.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getTxResponse = await server.getTransaction(response.hash);
    attempts++;
  }

  let resultValue: string | undefined;
  let events: ContractEventData[] = [];

  if (
    getTxResponse.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS
  ) {
    if (getTxResponse.returnValue) {
      resultValue = StellarSdk.scValToNative(
        getTxResponse.returnValue
      )?.toString();
    }

    // Extract events from TransactionMeta object
    if (getTxResponse.resultMetaXdr) {
      events = extractEvents(getTxResponse.resultMetaXdr, contractId);
    }
  }

  return { hash: response.hash, resultValue, events };
}

// --- Event Polling ---

export async function fetchContractEvents(
  contractId: string,
  startLedger: number
): Promise<{
  events: ContractEventData[];
  latestLedger: number;
}> {
  try {
    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [["*"]],
        },
      ],
      limit: 10,
    });

    const events: ContractEventData[] = [];
    let latestLedger = startLedger;

    if (response.events) {
      for (const event of response.events) {
        try {
          const topic =
            event.topic
              .map((t: unknown) => String(t))
              .join(":") || "unknown";
          const rawValue = (event as unknown as { value: string }).value;
          const value = rawValue
            ? StellarSdk.scValToNative(
                StellarSdk.xdr.ScVal.fromXDR(rawValue, "base64")
              )?.toString() || ""
            : "";

          events.push({ topic, value, contractId });
        } catch {
          // skip unparseable events
        }
        if (event.ledger > latestLedger) {
          latestLedger = event.ledger;
        }
      }
    }

    return { events, latestLedger };
  } catch {
    return { events: [], latestLedger: startLedger };
  }
}

export async function getLatestLedger(): Promise<number> {
  try {
    const health = await server.getLatestLedger();
    return health.sequence;
  } catch {
    return 0;
  }
}

// --- Event Extraction ---

/** Extract readable events from a TransactionMeta XDR object. */
function extractEvents(
  meta: StellarSdk.xdr.TransactionMeta,
  contractId: string
): ContractEventData[] {
  try {
    const events: ContractEventData[] = [];

    // Access v3 soroban meta
    const v3 = meta.v3();
    if (!v3) return events;

    const sorobanMeta = v3.sorobanMeta();
    if (!sorobanMeta?.events()) return events;

    for (const event of sorobanMeta.events()) {
      try {
        const rawContractId = event.contractId();
        if (!rawContractId) continue;
        const evtContractId = StellarSdk.StrKey.encodeContract(
          rawContractId
        );
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
        // skip
      }
    }
    return events;
  } catch {
    return [];
  }
}
