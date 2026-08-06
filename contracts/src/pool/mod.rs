#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol, symbol_short, Vec};
use crate::common::storage as s;
use crate::common::events as e;
use crate::token;

// ---- Data Types ----

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakeInfo {
    pub amount: i128,
    pub start_ledger: u32,
    pub reward_claimed: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PoolConfig {
    pub reward_rate: i128,       // reward per token per ledger (scaled by 10^7)
    pub min_stake: i128,
    pub max_stake: i128,
    pub lock_period: u32,        // in ledgers
    pub active: bool,
}

// ---- Storage Keys ----

const KEY_POOL_CONFIG: Symbol = symbol_short!("POOL_CFG");
const KEY_STAKES: Symbol = symbol_short!("STAKES");
const KEY_TOTAL_STAKED: Symbol = symbol_short!("TOT_STKD");
const KEY_REWARD_POOL: Symbol = symbol_short!("REW_POOL");
const KEY_TOKEN_ID: Symbol = symbol_short!("TOK_ID");

#[contract]
pub struct DripPool;

#[contracttype]
#[derive(Clone)]
pub enum StakeKey {
    Stake(Address),
}

// ---- Implementation ----

#[contractimpl]
impl DripPool {
    /// Initialize the staking pool. Only admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract_id: Address,
        reward_rate: i128,
        min_stake: i128,
        lock_period: u32,
    ) {
        if env.storage().persistent().has(&s::KEY_ADMIN) {
            panic!("Already initialized");
        }
}
