use soroban_sdk::{contract, contractimpl, contractevent, symbol_short, Env, Symbol, String, Address};

const GLOBAL_COUNTER: Symbol = symbol_short!("GLOBAL");
const USER_COUNTER: Symbol = symbol_short!("USER_CTR");
const GREETING_KEY: Symbol = symbol_short!("GREETING");

#[contractevent]
pub struct IncrementEvent {
    pub user: Address,
    pub global_count: u32,
    pub user_count: u32,
}

#[contractevent]
pub struct GreetingEvent {
    pub user: Address,
    pub message: String,
}

#[contract]
pub struct StellarDripzCounter;

#[contractimpl]
impl StellarDripzCounter {
    pub fn increment(env: Env, user: Address) -> u32 {
        user.require_auth();

        let mut global: u32 = env
            .storage()
            .persistent()
            .get(&GLOBAL_COUNTER)
            .unwrap_or(0);
        global += 1;
        env.storage().persistent().set(&GLOBAL_COUNTER, &global);

        // Per-user counter — keyed by user address
        let user_key = (USER_COUNTER, &user);
        let mut user_count: u32 = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(0);
        user_count += 1;
        env.storage().persistent().set(&user_key, &user_count);

        IncrementEvent {
            user: user.clone(),
            global_count: global,
            user_count,
        }
        .publish(&env);

        global
    }

    pub fn get_global(env: Env) -> u32 {
        env.storage().persistent().get(&GLOBAL_COUNTER).unwrap_or(0)
    }

    pub fn get_user(env: Env, user: Address) -> u32 {
        let user_key = (USER_COUNTER, &user);
        env.storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(0)
    }

    pub fn set_greeting(env: Env, user: Address, message: String) {
        user.require_auth();
        env.storage().persistent().set(&GREETING_KEY, &message);

        GreetingEvent {
            user: user.clone(),
            message: message.clone(),
        }
        .publish(&env);
    }

    pub fn get_greeting(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&GREETING_KEY)
            .unwrap_or(String::from_str(&env, "Hello from StellarDripz!"))
    }
}

