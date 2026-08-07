/**
 * Re-export from lib/wallets/ for backwards compatibility.
 * New code should import directly from @/lib/wallets/walletKit and @/lib/wallets/freighter.
 */
export {
  connectWithWallet,
  clearPersistedWallet,
  persistWallet,
  loadPersistedWallet,
  checkAnyWalletInstalled,
  getSupportedWallets,
  resetKit,
  signTx,
} from "@/lib/wallets/walletKit";

export {
  connectFreighter,
  signFreighter,
  detectFreighterNetwork,
  isFreighterInstalled,
} from "@/lib/wallets/freighter";
export { detectFreighterNetwork as detectNetwork } from "@/lib/wallets/freighter";
