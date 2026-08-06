/**
 * Per-address rate limiter for faucet requests.
 * Uses localStorage for persistence.
 */
const STORAGE_KEY = "stellardripz_cooldowns";

interface CooldownEntry {
  address: string;
  lastRequest: number; // epoch ms
}

function getAll(): CooldownEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CooldownEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: CooldownEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* blocked */ }
}

/** Check if an address is within the cooldown period. Returns remaining ms or 0. */
export function getCooldownRemaining(address: string, cooldownMs: number = 60_000): number {
  const entries = getAll();
  const entry = entries.find((e) => e.address === address);
  if (!entry) return 0;

  const elapsed = Date.now() - entry.lastRequest;
  if (elapsed >= cooldownMs) return 0;
  return cooldownMs - elapsed;
}

/** Record a faucet request for an address. */
export function recordFaucetRequest(address: string): void {
  const entries = getAll().filter((e) => e.address !== address);
  entries.push({ address, lastRequest: Date.now() });
  saveAll(entries);
}

/** Check if an address can request faucet funds right now. */
export function canRequestFaucet(address: string, cooldownMs?: number): boolean {
  return getCooldownRemaining(address, cooldownMs) === 0;
}

/** Clear all cooldowns (for dev/testing). */
export function clearAllCooldowns(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

