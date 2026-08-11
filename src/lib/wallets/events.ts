/**
 * Wallet event system for connection lifecycle management.
 *
 * Provides a pub/sub pattern for wallet state changes that components
 * can subscribe to, enabling reactive UI updates on connect/disconnect/error.
 *
 * SCF Tranche 2 deliverable: Wallet event handling improvements.
 */

export type WalletEventType =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "accountsChanged"
  | "networkChanged";

export interface WalletEvent {
  type: WalletEventType;
  walletId?: string;
  walletName?: string;
  publicKey?: string;
  error?: string;
  timestamp: number;
}

type Listener = (event: WalletEvent) => void;

const listeners = new Map<WalletEventType, Set<Listener>>();

/** Subscribe to a wallet event type. Returns unsubscribe function. */
export function onWalletEvent(
  type: WalletEventType,
  listener: Listener,
): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(listener);
  return () => {
    listeners.get(type)?.delete(listener);
  };
}

/** Emit a wallet event to all subscribers. */
export function emitWalletEvent(event: WalletEvent): void {
  const typeListeners = listeners.get(event.type);
  if (typeListeners) {
    for (const listener of typeListeners) {
      try {
        listener(event);
      } catch {
        // Don't let one broken listener break others
      }
    }
  }
  // Also notify "any event" listeners
  const anyListeners = listeners.get("connected"); // reuse for broadcast
  // Use a wildcard key for global listeners
  const globalListeners = listeners.get("accountsChanged" as WalletEventType);
  // NOTE: For simplicity, components should subscribe to specific events.
  // A global event bus can be added in a future iteration.
}

/** Helper to emit a connecting event. */
export function notifyConnecting(walletId: string, walletName: string): void {
  emitWalletEvent({
    type: "connecting",
    walletId,
    walletName,
    timestamp: Date.now(),
  });
}

/** Helper to emit a connected event. */
export function notifyConnected(
  walletId: string,
  walletName: string,
  publicKey: string,
): void {
  emitWalletEvent({
    type: "connected",
    walletId,
    walletName,
    publicKey,
    timestamp: Date.now(),
  });
}

/** Helper to emit a disconnected event. */
export function notifyDisconnected(
  walletId?: string,
  walletName?: string,
): void {
  emitWalletEvent({
    type: "disconnected",
    walletId,
    walletName,
    timestamp: Date.now(),
  });
}

/** Helper to emit an error event. */
export function notifyError(
  error: string,
  walletId?: string,
  walletName?: string,
): void {
  emitWalletEvent({
    type: "error",
    walletId,
    walletName,
    error,
    timestamp: Date.now(),
  });
}
