/** Direct Stellar client — browser-side reads that bypass the API proxy. */
import * as StellarSdk from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/lib/stellar/network";
export interface DirectBalanceResult { xlm: string; raw: string; assets: Array<{ code: string; balance: string; formatted: string }>; }
export async function directFetchBalance(address: string): Promise<DirectBalanceResult> { return { xlm: "0", raw: "0", assets: [] }; }
export async function directSimulateContract(cId: string, fn: string, args: StellarSdk.xdr.ScVal[], signer: string) { return { resultValue: undefined }; }
export async function directFetchContractEvents(cId: string, start: number): Promise<{ events: Array<{topic:string;value:string;contractId:string}>; latestLedger: number }> { return { events: [], latestLedger: start }; }
export async function directGetLatestLedger(): Promise<number> { return 0; }
export async function directRequestFaucet(addr: string): Promise<{ hash: string }> { return { hash: "" }; }
export { STELLAR_NETWORK };
