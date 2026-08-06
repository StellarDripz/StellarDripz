/**
 * Database service — transaction history, analytics, and session storage.
 * Uses a JSON file for persistence (production: swap with PostgreSQL/Supabase).
 */
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "stellardripz-db.json");

// ---- Types ----

export interface TxRecord {
  id: string;
  type: "faucet" | "send" | "contract";
  status: "pending" | "success" | "error";
  hash: string | null;
  amount: string;
  assetCode?: string;
  senderAddress: string;
  destinationAddress: string;
  functionName?: string;
  contractId?: string;
  errorMessage?: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

export interface AnalyticsEntry {
  id: string;
  eventType: "faucet_request" | "payment_send" | "contract_invoke" | "wallet_connect" | "balance_fetch";
  address: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface SessionEntry {
  address: string;
  walletId: string;
  walletName: string;
  connectedAt: number;
  lastActive: number;
  ip?: string;
}

interface Database {
  transactions: TxRecord[];
  analytics: AnalyticsEntry[];
  sessions: SessionEntry[];
  lastCleanup: number;
}

// ---- Read/Write ----

function ensureDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readDb(): Database {
  ensureDir();
  try {
    if (!fs.existsSync(DB_PATH)) return getEmptyDb();
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as Database;
  } catch {
    return getEmptyDb();
  }
}

function writeDb(db: Database): void {
  ensureDir();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch { /* disk full or permission error */ }
}

function getEmptyDb(): Database {
  return { transactions: [], analytics: [], sessions: [], lastCleanup: Date.now() };
}

// ---- Transactions ----

export function saveTransaction(tx: TxRecord): void {
  const db = readDb();
  db.transactions.unshift(tx);
  if (db.transactions.length > 1000) db.transactions = db.transactions.slice(0, 1000);
  writeDb(db);
}

export function updateTransaction(id: string, updates: Partial<TxRecord>): void {
  const db = readDb();
  const idx = db.transactions.findIndex((t) => t.id === id);
  if (idx !== -1) {
    db.transactions[idx] = { ...db.transactions[idx], ...updates };
    writeDb(db);
  }
}

export function getTransactions(
  address?: string,
  type?: TxRecord["type"],
  limit = 50
): TxRecord[] {
  const db = readDb();
  let txs = db.transactions;
  if (address) txs = txs.filter((t) => t.senderAddress === address);
  if (type) txs = txs.filter((t) => t.type === type);
  return txs.slice(0, limit);
}

// ---- Analytics ----

export function logAnalytics(entry: Omit<AnalyticsEntry, "id" | "timestamp">): void {
  const db = readDb();
  db.analytics.push({
    ...entry,
    id: `an-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  });
  if (db.analytics.length > 5000) db.analytics = db.analytics.slice(-5000);
  writeDb(db);
}

export function getAnalytics(
  eventType?: AnalyticsEntry["eventType"],
  limit = 100
): AnalyticsEntry[] {
  const db = readDb();
  let entries = db.analytics;
  if (eventType) entries = entries.filter((e) => e.eventType === eventType);
  return entries.slice(-limit).reverse();
}

export function getAnalyticsSummary(): Record<string, { total: number; uniqueAddresses: number }> {
  const db = readDb();
  const summary: Record<string, { total: number; addresses: Set<string> }> = {};

  for (const entry of db.analytics) {
    if (!summary[entry.eventType]) {
      summary[entry.eventType] = { total: 0, addresses: new Set() };
    }
    summary[entry.eventType].total++;
    summary[entry.eventType].addresses.add(entry.address);
  }

  const result: Record<string, { total: number; uniqueAddresses: number }> = {};
  for (const [key, val] of Object.entries(summary)) {
    result[key] = { total: val.total, uniqueAddresses: val.addresses.size };
  }
  return result;
}

// ---- Sessions ----

export function saveSession(session: SessionEntry): void {
  const db = readDb();
  const idx = db.sessions.findIndex((s) => s.address === session.address);
  if (idx !== -1) db.sessions[idx] = session;
  else db.sessions.push(session);
  writeDb(db);
}

export function getSession(address: string): SessionEntry | null {
  const db = readDb();
  return db.sessions.find((s) => s.address === address) || null;
}

export function getActiveSessions(): SessionEntry[] {
  const db = readDb();
  const now = Date.now();
  return db.sessions.filter((s) => now - s.lastActive < 24 * 60 * 60 * 1000);
}

// ---- Cleanup ----

export function runPeriodicCleanup(): void {
  const db = readDb();
  const now = Date.now();

  // Clean up old sessions (7 days)
  db.sessions = db.sessions.filter((s) => now - s.lastActive < 7 * 24 * 60 * 60 * 1000);

  // Clean up old analytics (30 days)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  db.analytics = db.analytics.filter((e) => now - e.timestamp < thirtyDays);

  db.lastCleanup = now;
  writeDb(db);
}
