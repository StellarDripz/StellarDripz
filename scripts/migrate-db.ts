/**
 * Database Migration Runner
 * =========================
 * Validates Supabase connectivity and checks migration status.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Prerequisites:
 *   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * How to apply the schema:
 *   The Supabase JS client cannot execute arbitrary DDL (CREATE TABLE, etc.).
 *   Open the Supabase SQL Editor and paste the entire contents of:
 *     src/lib/server/supabase-schema.sql
 *
 *   Or use the Supabase CLI:
 *     npx supabase db push
 *
 * This script verifies your connection and reports which version is deployed.
 */

import { resolve } from "path";
import { readFileSync } from "fs";
import { loadEnv } from "../../scripts/env-loader";

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  // ── Validate env vars ──────────────────────────────────────────
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log(
      "╔══════════════════════════════════════════════════════════════╗\n" +
      "║  ⚠️  Supabase not configured                                ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║  Set these in .env.local:                                   ║\n" +
      "║    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co ║\n" +
      "║    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...                   ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║  Get them from: https://app.supabase.com → Settings → API   ║\n" +
      "╚══════════════════════════════════════════════════════════════╝",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Test connectivity ──────────────────────────────────────────
  console.log(`🔌 Connecting to ${SUPABASE_URL}...`);

  // Check if _migrations table exists (indicates schema is applied)
  const { data: migrations, error: migrationErr } = await supabase
    .from("_migrations")
    .select("version, name, applied_at")
    .order("version", { ascending: false });

  if (migrationErr) {
    // PostgREST error code 42P01 = undefined_table → schema not applied
    // Anything else (auth, network, etc.) is a real error
    const isUndefinedTable =
      migrationErr.code === "42P01" ||
      migrationErr.message?.includes("does not exist");

    if (!isUndefinedTable) {
      console.error(
        `\n❌ Connection error: ${migrationErr.message}\n` +
        `   Code: ${migrationErr.code || "unknown"}\n` +
        `   Hint: Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct.`,
      );
      process.exit(1);
    }

    console.log(
      "\n╔══════════════════════════════════════════════════════════════╗\n" +
      "║  📋 Schema not yet applied                                  ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║  Connection is working, but the _migrations table is        ║\n" +
      "║  missing. Apply the schema using one of these methods:      ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║                                                            ║\n" +
      "║  Option A — Supabase SQL Editor (recommended):              ║\n" +
      "║    1. Go to https://app.supabase.com                        ║\n" +
      "║    2. Open your project → SQL Editor                        ║\n" +
      "║    3. Paste the entire contents of:                         ║\n" +
      "║       src/lib/server/supabase-schema.sql                    ║\n" +
      "║    4. Click \"Run\"                                           ║\n" +
      "║                                                            ║\n" +
      "║  Option B — Supabase CLI:                                   ║\n" +
      "║    npx supabase db push                                     ║\n" +
      "║                                                            ║\n" +
      "╚══════════════════════════════════════════════════════════════╝",
    );

    // Print the schema path for convenience
    const schemaPath = resolve(
      process.cwd(),
      "src/lib/server/supabase-schema.sql",
    );
    console.log(`\n📄 Schema file: ${schemaPath}`);
    const schemaContent = readFileSync(schemaPath, "utf-8");
    const lines = schemaContent.split("\n").length;
    const bytes = Buffer.byteLength(schemaContent, "utf-8");
    console.log(`   ${lines} lines, ${(bytes / 1024).toFixed(1)} KB`);
    process.exit(0);
  }

  // ── Schema already applied ─────────────────────────────────────
  console.log("\n✅ Supabase connection verified!");
  console.log("   Schema is already applied.\n");

  if (migrations && migrations.length > 0) {
    console.log("   Applied migrations:");
    for (const m of migrations) {
      console.log(
        `     v${m.version} — ${m.name} (${new Date(m.applied_at).toLocaleString()})`,
      );
    }
  }

  // Quick health check: count rows in each table
  const tables = ["transactions", "analytics", "sessions"] as const;
  console.log("\n   Table row counts:");
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (!error) {
      console.log(`     ${table}: ${count} rows`);
    } else {
      console.log(`     ${table}: error — ${error.message}`);
    }
  }

  console.log("\n🎉 Database is ready for production use!");
}

main().catch((err) => {
  console.error("❌ Migration check failed:", err.message);
  process.exit(1);
});
