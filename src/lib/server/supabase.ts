/**
 * Supabase server-side admin client.
 * Uses the service_role key to bypass Row Level Security (RLS)
 * for administrative database operations.
 *
 * IMPORTANT: Never import this module in client-side code.
 * The SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;
let _initAttempted = false;

/**
 * Create or return a cached Supabase admin client.
 * Returns null if Supabase environment variables are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_initAttempted) return _adminClient;
  _initAttempted = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[StellarDripz] Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for production persistence.",
    );
    return null;
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _adminClient;
}

/**
 * Check if Supabase is configured and available.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseAdmin() !== null;
}
