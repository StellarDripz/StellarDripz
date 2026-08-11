use soroban_sdk::{Env, Symbol, symbol_short};

// ---- Storage Keys ----

pub const KEY_NAME: Symbol = symbol_short!("NAME");
pub const KEY_SYMBOL: Symbol = symbol_short!("SYMBOL");
pub const KEY_DECIMALS: Symbol = symbol_short!("DECIMALS");
pub const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
pub const KEY_TOTAL_SUPPLY: Symbol = symbol_short!("TOT_SUP");
pub const KEY_BALANCE: Symbol = symbol_short!("BALANCE");


// ---- Storage Helpers ----

/// Get or default for persistent storage
pub fn get_persistent<
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val> + soroban_sdk::TryFromVal<Env, soroban_sdk::Val>,
>(
    env: &Env,
    key: &Symbol,
    default: T,
) -> T {
    env.storage().persistent().get(key).unwrap_or(default)
}

/// Set persistent storage
pub fn set_persistent<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &Symbol,
    value: &T,
) {
    env.storage().persistent().set(key, value);
}

// NOTE: Instance storage helpers and require_admin removed as dead code (C6/C5).
// Each contract handles auth and storage independently. Instance storage
// is available directly via env.storage().instance() when needed.

