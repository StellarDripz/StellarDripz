/**
 * Re-export from lib/stellar/soroban for backwards compatibility.
 */
export {
  simulateContractCall,
  callContractFunction,
  fetchContractEvents,
  getLatestLedger,
} from "@/lib/stellar/soroban";
export type { ContractEventData } from "@/lib/stellar/soroban";
