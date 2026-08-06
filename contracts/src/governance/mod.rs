#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol, symbol_short, Vec, Map};
use crate::common::storage as s;
use crate::common::events as e;
use crate::token;

// ---- Data Types ----

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub for_votes: i128,
    pub against_votes: i128,
    pub abstain_votes: i128,
    pub created_ledger: u32,
    pub voting_end: u32,
    pub executed: bool,
    pub passed: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct VoteRecord {
    pub proposal_id: u64,
    pub vote: VoteChoice,
    pub power: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    For = 0,
    Against = 1,
    Abstain = 2,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GovernanceAction {
    SetRewardRate(i128),
    SetMinStake(i128),
    SetLockPeriod(u32),
    SetActive(bool),
    MintTokens(Address, i128),
}

// ---- Storage Keys ----

const KEY_PROPOSAL_COUNT: Symbol = symbol_short!("PROP_CT");
const KEY_PROPOSAL: Symbol = symbol_short!("PROP");
const KEY_VOTES: Symbol = symbol_short!("VOTES");
const KEY_TOKEN_ID: Symbol = symbol_short!("TOK_ID");
const KEY_POOL_ID: Symbol = symbol_short!("POOL_ID");
const KEY_VOTING_PERIOD: Symbol = symbol_short!("VOT_PER");
const KEY_MIN_POWER: Symbol = symbol_short!("MIN_POW");

#[contract]
pub struct DripGovernance;

// ---- Implementation ----

#[contractimpl]
impl DripGovernance {
    /// Initialize governance with token and pool contract references.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract_id: Address,
        pool_contract_id: Address,
        voting_period: u32,
        min_voting_power: i128,
    ) {
        if env.storage().persistent().has(&s::KEY_ADMIN) {
            panic!("Already initialized");
        }
}
