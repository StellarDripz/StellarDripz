use soroban_sdk::{Env, Symbol, symbol_short, Address, String, IntoVal};

/// Core event symbols shared across contracts
pub const EVENT_MINT: Symbol = symbol_short!("mint");
pub const EVENT_TRANSFER: Symbol = symbol_short!("transfer");
pub const EVENT_BURN: Symbol = symbol_short!("burn");
pub const EVENT_STAKE: Symbol = symbol_short!("stake");
pub const EVENT_UNSTAKE: Symbol = symbol_short!("unstake");
pub const EVENT_REWARD: Symbol = symbol_short!("reward");
pub const EVENT_VOTE: Symbol = symbol_short!("vote");
pub const EVENT_PROPOSE: Symbol = symbol_short!("propose");
pub const EVENT_BADGE_CLAIM: Symbol = symbol_short!("claim");
pub const EVENT_APPROVE: Symbol = symbol_short!("approve");

/// Publish a contract event with topics and data.
/// Topics must be a tuple of IntoVal<Env, Val> items (max 4).
pub fn publish(env: &Env, topics: impl soroban_sdk::Topics, data: impl IntoVal<Env, soroban_sdk::Val>) {
    env.events().publish(topics, data);
}

/// Emit a token transfer event
pub fn emit_transfer(env: &Env, from: &Address, to: &Address, amount: i128) {
    let zero = &Address::from_string(&String::from_str(env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"));
    let is_mint = *from == *zero;
    let is_burn = *to == *zero;

    let event_type = if is_mint {
        EVENT_MINT
    } else if is_burn {
        EVENT_BURN
    } else {
        EVENT_TRANSFER
    };

    publish(
        env,
        (event_type, from, to),
        amount,
    );
}
// Event emitter helpers for contract lifecycle notifications

