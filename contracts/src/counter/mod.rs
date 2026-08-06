#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol, String};

const GLOBAL_COUNTER: Symbol = symbol_short!("GLOBAL");
const USER_COUNTER: Symbol = symbol_short!("USER_CTR");
const GREETING_KEY: Symbol = symbol_short!("GREETING");

#[contract]
pub struct StellarDripzCounter;

#[contractimpl]
impl StellarDripzCounter {
    pub fn increment(env: Env, user: soroban_sdk::Address) -> u32 {
        user.require_auth();

        let mut global: u32 = env
            .storage()
            .persistent()
            .get(&GLOBAL_COUNTER)
            .unwrap_or(0);
        global += 1;
        env.storage().persistent().set(&GLOBAL_COUNTER, &global);

        let mut user_count: u32 = env
            .storage()
            .persistent()
            .get(&USER_COUNTER)
            .unwrap_or(0);
        user_count += 1;
        env.storage().persistent().set(&USER_COUNTER, &user_count);

        env.events()
            .publish((symbol_short!("increment"), &user), (global, user_count));

        global
    }

    pub fn get_global(env: Env) -> u32 {
        env.storage().persistent().get(&GLOBAL_COUNTER).unwrap_or(0)
    }

    pub fn get_user(env: Env, _user: soroban_sdk::Address) -> u32 {
        env.storage()
            .persistent()
            .get(&USER_COUNTER)
            .unwrap_or(0)
    }

    pub fn set_greeting(env: Env, user: soroban_sdk::Address, message: String) {
        user.require_auth();
        env.storage().persistent().set(&GREETING_KEY, &message);
        env.events()
            .publish((symbol_short!("greeting"), &user), message);
    }

    pub fn get_greeting(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&GREETING_KEY)
            .unwrap_or(String::from_str(&env, "Hello from StellarDripz!"))
    }
}
// Increment counter: increases per-user value by 1 and emits event
