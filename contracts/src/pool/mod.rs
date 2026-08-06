#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol, symbol_short, Vec};
use crate::common::storage as s;
use crate::common::events as e;

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
        admin.require_auth();

        s::set_persistent(&env, &s::KEY_ADMIN, &admin);
        s::set_persistent(&env, &KEY_TOKEN_ID, &token_contract_id);

        let config = PoolConfig {
            reward_rate,
            min_stake,
            max_stake: 10_000_000_000_000i128, // 10M tokens
            lock_period,
            active: true,
        };
        s::set_persistent(&env, &KEY_POOL_CONFIG, &config);
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &0i128);
        s::set_persistent(&env, &KEY_REWARD_POOL, &0i128);

        e::publish(&env, (symbol_short!("pool_init"), &admin), config.reward_rate);
    }

    /// Stake tokens. User must approve this contract to spend tokens first.
    pub fn stake(env: Env, user: Address, amount: i128) {
        user.require_auth();

        let config: PoolConfig = s::get_persistent(
            &env, &KEY_POOL_CONFIG,
            PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false },
        );

        if !config.active {
            panic!("Pool is not active");
        }
        if amount < config.min_stake {
            panic!("Below minimum stake");
        }

        let stake_key = StakeKey::Stake(user.clone());

        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo {
            amount: 0, start_ledger: 0, reward_claimed: 0,
        });
        let new_total = existing_stake.amount + amount;
        if new_total > config.max_stake {
            panic!("Exceeds maximum stake");
        }

        // Claim pending rewards first
        if existing_stake.amount > 0 {
            let pending = Self::calculate_reward(&env, &user);
            if pending > 0 {
                existing_stake.reward_claimed += pending;
            }
        }

        let current_ledger = env.ledger().sequence();
        existing_stake.amount = new_total;
        existing_stake.start_ledger = current_ledger;

        env.storage().persistent().set(&stake_key, &existing_stake);

        let mut total_staked: i128 = s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128);
        total_staked += amount;
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &total_staked);

        e::publish(&env, (e::EVENT_STAKE, &user), amount);
    }

    /// Unstake tokens. Subject to lock period.
    pub fn unstake(env: Env, user: Address, amount: i128) {
        user.require_auth();

        let config: PoolConfig = s::get_persistent(
            &env, &KEY_POOL_CONFIG,
            PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false },
        );

        let stake_key = StakeKey::Stake(user.clone());
        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo {
            amount: 0, start_ledger: 0, reward_claimed: 0,
        });

        if existing_stake.amount < amount {
            panic!("Insufficient staked amount");
        }

        let current_ledger = env.ledger().sequence();
        let locked_until = existing_stake.start_ledger + config.lock_period;
        if current_ledger < locked_until {
            panic!("Tokens are locked");
        }

        // Claim pending rewards before unstaking
        if existing_stake.amount > 0 {
            let pending = Self::calculate_reward(&env, &user);
            if pending > 0 {
                existing_stake.reward_claimed += pending;
            }
        }

        existing_stake.amount -= amount;
        existing_stake.start_ledger = current_ledger;

        if existing_stake.amount == 0 {
            env.storage().persistent().remove(&stake_key);
        } else {
            env.storage().persistent().set(&stake_key, &existing_stake);
        }

        let mut total_staked: i128 = s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128);
        total_staked -= amount;
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &total_staked);

        e::publish(&env, (e::EVENT_UNSTAKE, &user), amount);
    }

    /// Claim accumulated rewards.
    pub fn claim_reward(env: Env, user: Address) -> i128 {
        user.require_auth();

        let stake_key = StakeKey::Stake(user.clone());
        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo {
            amount: 0, start_ledger: 0, reward_claimed: 0,
        });

        let pending = Self::calculate_reward(&env, &user);
        let total_reward = existing_stake.reward_claimed + pending;

        if total_reward <= 0 {
            return 0;
        }

        existing_stake.reward_claimed = 0;
        existing_stake.start_ledger = env.ledger().sequence();
        env.storage().persistent().set(&stake_key, &existing_stake);

        e::publish(&env, (e::EVENT_REWARD, &user), total_reward);
        total_reward
    }

    /// Calculate pending reward for a user (doesn't modify state).
    pub fn calculate_reward(env: &Env, user: &Address) -> i128 {
        let config: PoolConfig = s::get_persistent(
            env, &KEY_POOL_CONFIG,
            PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false },
        );

        let stake_key = StakeKey::Stake(user.clone());
        let stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo {
            amount: 0, start_ledger: 0, reward_claimed: 0,
        });

        if stake.amount == 0 || config.reward_rate == 0 {
            return 0;
        }

        let current_ledger = env.ledger().sequence();
        let elapsed = (current_ledger as i128) - (stake.start_ledger as i128);
        if elapsed <= 0 {
            return 0;
        }

        // reward = amount * rate * elapsed / 10^7
        (stake.amount * config.reward_rate * elapsed) / 10_000_000i128
    }

    /// Add rewards to the pool (admin only).
    pub fn fund_rewards(env: Env, admin: Address, amount: i128) {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        if admin != stored_admin {
            panic!("Only admin");
        }
        admin.require_auth();

        let mut reward_pool: i128 = s::get_persistent(&env, &KEY_REWARD_POOL, 0i128);
        reward_pool += amount;
        s::set_persistent(&env, &KEY_REWARD_POOL, &reward_pool);
    }

    /// Admin pause/unpause pool.
    pub fn set_active(env: Env, admin: Address, active: bool) {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        if admin != stored_admin {
            panic!("Only admin");
        }
        admin.require_auth();

        let mut config: PoolConfig = s::get_persistent(
            &env, &KEY_POOL_CONFIG,
            PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false },
        );
        config.active = active;
        s::set_persistent(&env, &KEY_POOL_CONFIG, &config);

        e::publish(&env, (symbol_short!("pool_active"), &admin), active);
    }

    // ---- Getters ----

    pub fn get_stake(env: Env, user: Address) -> StakeInfo {
        let key = StakeKey::Stake(user);
        env.storage().persistent().get(&key).unwrap_or(StakeInfo {
            amount: 0, start_ledger: 0, reward_claimed: 0,
        })
    }

    pub fn get_config(env: Env) -> PoolConfig {
        s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig {
            reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false,
        })
    }

    pub fn get_total_staked(env: Env) -> i128 {
        s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128)
    }
}

// ---- Tests ----

#[cfg(test)]
mod pool_test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_stake_and_unstake() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let user = Address::random(&env);
        let token_id = Address::random(&env);

        let contract_id = env.register(DripPool, ());
        let client = DripPoolClient::new(&env, &contract_id);

        client.initialize(&admin, &token_id, &100i128, &10i128, &100u32);

        // Stake
        client.stake(&user, &500i128);
        let stake = client.get_stake(user.clone());
        assert_eq!(stake.amount, 500i128);
        assert_eq!(client.get_total_staked(), 500i128);

        // Unstake
        // Need to advance ledgers past lock period
        env.ledger().set_sequence_number(200);
        client.unstake(&user, &300i128);
        let stake2 = client.get_stake(user);
        assert_eq!(stake2.amount, 200i128);
        assert_eq!(client.get_total_staked(), 200i128);
    }

    #[test]
    fn test_reward_calculation() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let user = Address::random(&env);
        let token_id = Address::random(&env);

        let contract_id = env.register(DripPool, ());
        let client = DripPoolClient::new(&env, &contract_id);

        client.initialize(&admin, &token_id, &1000i128, &10i128, &0u32);

        client.stake(&user, &1000i128);

        // Advance 100 ledgers
        env.ledger().set_sequence_number(200);

        let reward = client.calculate_reward(&user);
        // reward = 1000 * 1000 * 100 / 10^7 = 10
        assert!(reward > 0);
    }

    #[test]
    fn test_admin_controls() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let token_id = Address::random(&env);

        let contract_id = env.register(DripPool, ());
        let client = DripPoolClient::new(&env, &contract_id);

        client.initialize(&admin, &token_id, &100i128, &1i128, &0u32);

        let config = client.get_config();
        assert!(config.active);

        client.set_active(&admin, &false);
        let config2 = client.get_config();
        assert!(!config2.active);
    }
}
