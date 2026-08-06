#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

// Counters are stored per-user (by address) plus a global counter
const GLOBAL_COUNTER: Symbol = symbol_short!("GLOBAL");
const USER_COUNTER: Symbol = symbol_short!("USER_CTR");

#[contract]
pub struct StellarDripzCounter;

#[contractimpl]
impl StellarDripzCounter {
    /// Increment the global counter and return the new value.
    /// Emits an "increment" event with the new count.
    pub fn increment(env: Env, user: soroban_sdk::Address) -> u32 {
        user.require_auth();

        // Increment global counter
        let mut global: u32 = env
            .storage()
            .persistent()
            .get(&GLOBAL_COUNTER)
            .unwrap_or(0);
        global += 1;
        env.storage().persistent().set(&GLOBAL_COUNTER, &global);

        // Increment per-user counter
        let mut user_count: u32 = env
            .storage()
            .persistent()
            .get(&USER_COUNTER)
            .unwrap_or(0);
        user_count += 1;
        env.storage().persistent().set(&USER_COUNTER, &user_count);

        // Emit event for real-time listeners
        env.events()
            .publish((symbol_short!("increment"), &user), (global, user_count));

        global
    }

    /// Get the current value of the global counter (no auth required).
    pub fn get_global(env: Env) -> u32 {
        env.storage().persistent().get(&GLOBAL_COUNTER).unwrap_or(0)
    }

    /// Get the current value of the per-user counter.
    pub fn get_user(env: Env, _user: soroban_sdk::Address) -> u32 {
        env.storage()
            .persistent()
            .get(&USER_COUNTER)
            .unwrap_or(0)
    }

    /// Set a custom greeting message (demonstrates string storage).
    pub fn set_greeting(env: Env, user: soroban_sdk::Address, message: soroban_sdk::String) {
        user.require_auth();
        let key = symbol_short!("GREETING");
        env.storage().persistent().set(&key, &message);

        env.events()
            .publish((symbol_short!("greeting"), &user), message);
    }

    /// Get the stored greeting message.
    pub fn get_greeting(env: Env) -> soroban_sdk::String {
        let key = symbol_short!("GREETING");
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(soroban_sdk::String::from_str(
                &env,
                "Hello from StellarDripz!",
            ))
    }
}

#[cfg(test)]
mod test;
