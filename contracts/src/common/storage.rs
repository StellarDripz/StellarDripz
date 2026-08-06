use soroban_sdk::{Address, Env, String, Symbol, symbol_short};

// ---- Storage Keys ----

pub const KEY_NAME: Symbol = symbol_short!("NAME");
pub const KEY_SYMBOL: Symbol = symbol_short!("SYMBOL");
pub const KEY_DECIMALS: Symbol = symbol_short!("DECIMALS");
pub const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
pub const KEY_TOTAL_SUPPLY: Symbol = symbol_short!("TOT_SUP");
pub const KEY_BALANCE: Symbol = symbol_short!("BALANCE");
pub const KEY_ALLOWANCE: Symbol = symbol_short!("ALLOW");
pub const KEY_STAKE: Symbol = symbol_short!("STAKE");
pub const KEY_PROPOSAL: Symbol = symbol_short!("PROP");
pub const KEY_BADGE: Symbol = symbol_short!("BADGE");

// ---- Storage Helpers ----

/// Get or default for persistent storage
pub fn get_persistent<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val> + soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &Symbol,
    default: T,
) -> T {
    env.storage()
        .persistent()
        .get(key)
        .unwrap_or(default)
}

/// Set persistent storage
pub fn set_persistent<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &Symbol,
    value: &T,
) {
    env.storage().persistent().set(key, value);
}

/// Get or default for instance storage (faster, but doesn't persist across upgrades)
pub fn get_instance<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val> + soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &Symbol,
    default: T,
) -> T {
    env.storage()
        .instance()
        .get(key)
        .unwrap_or(default)
}

/// Set instance storage
pub fn set_instance<T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &Symbol,
    value: &T,
) {
    env.storage().instance().set(key, value);
}

/// Require authorization from the contract admin
pub fn require_admin(env: &Env, admin: &Address) {
    admin.require_auth();
}
// Persistent storage keys for contract state variables
