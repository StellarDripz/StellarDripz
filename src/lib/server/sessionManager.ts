/**
 * Session manager for wallet connections.
 * Validates and tracks wallet sessions server-side.
 */
import type { SessionEntry } from "./dbService";
import { saveSession, getSession, logAnalytics } from "./dbService";

export function createSession(
  address: string,
  walletId: string,
  walletName: string,
  requestInfo: { ip?: string; userAgent?: string }
): SessionEntry {
  const now = Date.now();
  const existing = getSession(address);

  const session: SessionEntry = {
    address,
    walletId,
    walletName,
    connectedAt: existing?.connectedAt || now,
    lastActive: now,
    ip: requestInfo.ip,
  };

  saveSession(session);
  logAnalytics({ eventType: "wallet_connect", address, data: { walletId, walletName } });

  return session;
}

export function validateSession(address: string): SessionEntry | null {
  const session = getSession(address);
  if (!session) return null;

  const now = Date.now();
  // Session expires after 24h of inactivity
  if (now - session.lastActive > 24 * 60 * 60 * 1000) return null;

  // Update lastActive
  session.lastActive = now;
  saveSession(session);

  return session;
}
