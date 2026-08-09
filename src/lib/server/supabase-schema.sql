-- =============================================================================
-- StellarDripz Supabase Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- or via: npx supabase db push
--
-- Tables:
--   transactions  — faucet requests, payments, contract invocations
--   analytics     — event tracking (faucet, payment, contract, wallet, balance)
--   sessions      — wallet session persistence
-- =============================================================================

-- ─── Transactions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('faucet', 'send', 'contract')),
  status          TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  hash            TEXT,
  amount          TEXT NOT NULL,
  asset_code      TEXT,
  sender_address  TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  function_name   TEXT,
  contract_id     TEXT,
  error_message   TEXT,
  timestamp       BIGINT NOT NULL,
  ip              TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by sender address
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_address);
-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
-- Index for ordering by timestamp
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);

-- ─── Analytics ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics (
  id              TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL CHECK (
    event_type IN (
      'faucet_request', 'payment_send', 'contract_invoke',
      'wallet_connect', 'balance_fetch'
    )
  ),
  address         TEXT NOT NULL,
  timestamp       BIGINT NOT NULL,
  data            JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_address ON analytics(address);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp DESC);

-- ─── Sessions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  address         TEXT PRIMARY KEY,
  wallet_id       TEXT NOT NULL,
  wallet_name     TEXT NOT NULL,
  connected_at    BIGINT NOT NULL,
  last_active     BIGINT NOT NULL,
  ip              TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active DESC);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────
-- Enable RLS on all tables for multi-tenancy safety.
-- The server-side admin client uses the service_role key and bypasses RLS.
-- Client-side access (if ever added) would use anon key + these policies.

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Transactions: users can only see their own transactions
CREATE POLICY transactions_self_access ON transactions
  FOR ALL
  USING (sender_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Analytics: users can only see their own analytics
CREATE POLICY analytics_self_access ON analytics
  FOR ALL
  USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Sessions: users can only see/manage their own sessions
CREATE POLICY sessions_self_access ON sessions
  FOR ALL
  USING (address = current_setting('request.jwt.claims', true)::json->>'sub');
