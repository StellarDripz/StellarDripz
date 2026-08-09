/**
 * @deprecated Use src/lib/server/dbService.ts for all analytics tracking.
 *
 * This client-side localStorage module is superseded by the server-side
 * dbService which provides a unified API with Supabase primary and
 * in-memory fallback backends. The event type names here (send_payment,
 * contract_call) are inconsistent with the canonical names used by
 * dbService (payment_send, contract_invoke).
 *
 * Kept for reference during migration. Remove after all consumers
 * have been migrated to the server-side dbService.
 */

export {};
