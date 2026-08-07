use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, symbol_short};
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
    pub reward_rate: i128,
    pub min_stake: i128,
    pub max_stake: i128,
    pub lock_period: u32,
    pub active: bool,
}

const KEY_POOL_CONFIG: Symbol = symbol_short!("POOL_CFG");
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

#[contractimpl]
impl DripPool {
    pub fn initialize_pool(env: Env, admin: Address, token_contract_id: Address, reward_rate: i128, min_stake: i128, lock_period: u32) {
        if env.storage().persistent().has(&s::KEY_ADMIN) { panic!("Already initialized"); }
        admin.require_auth();
        s::set_persistent(&env, &s::KEY_ADMIN, &admin);
        s::set_persistent(&env, &KEY_TOKEN_ID, &token_contract_id);
        let config = PoolConfig { reward_rate, min_stake, max_stake: 10_000_000_000_000i128, lock_period, active: true };
        s::set_persistent(&env, &KEY_POOL_CONFIG, &config);
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &0i128);
        s::set_persistent(&env, &KEY_REWARD_POOL, &0i128);
        e::publish(&env, (symbol_short!("pool_init"), &admin), config.reward_rate);
    }

    pub fn stake(env: Env, user: Address, amount: i128) {
        user.require_auth();
        let config: PoolConfig = s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false });
        if !config.active { panic!("Pool is not active"); }
        if amount < config.min_stake { panic!("Below minimum stake"); }
        let token_id: Address = s::get_persistent(&env, &KEY_TOKEN_ID, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        let pool_address = env.current_contract_address();
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.transfer_from(&pool_address, &user, &pool_address, &amount);
        let stake_key = StakeKey::Stake(user.clone());
        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo { amount: 0, start_ledger: 0, reward_claimed: 0 });
        let new_total = existing_stake.amount + amount;
        if new_total > config.max_stake { panic!("Exceeds maximum stake"); }
        if existing_stake.amount > 0 { let pending = Self::calculate_reward(env.clone(), user.clone()); if pending > 0 { existing_stake.reward_claimed += pending; } }
        let current_ledger = env.ledger().sequence();
        existing_stake.amount = new_total;
        existing_stake.start_ledger = current_ledger;
        env.storage().persistent().set(&stake_key, &existing_stake);
        let mut total_staked: i128 = s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128);
        total_staked += amount;
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &total_staked);
        e::publish(&env, (e::EVENT_STAKE, &user), amount);
    }

    pub fn unstake(env: Env, user: Address, amount: i128) {
        user.require_auth();
        let config: PoolConfig = s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false });
        let stake_key = StakeKey::Stake(user.clone());
        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo { amount: 0, start_ledger: 0, reward_claimed: 0 });
        if existing_stake.amount < amount { panic!("Insufficient staked amount"); }
        let current_ledger = env.ledger().sequence();
        let locked_until = existing_stake.start_ledger + config.lock_period;
        if current_ledger < locked_until { panic!("Tokens are locked"); }
        if existing_stake.amount > 0 { let pending = Self::calculate_reward(env.clone(), user.clone()); if pending > 0 { existing_stake.reward_claimed += pending; } }
        existing_stake.amount -= amount;
        existing_stake.start_ledger = current_ledger;
        if existing_stake.amount == 0 { env.storage().persistent().remove(&stake_key); } else { env.storage().persistent().set(&stake_key, &existing_stake); }
        let mut total_staked: i128 = s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128);
        total_staked -= amount;
        s::set_persistent(&env, &KEY_TOTAL_STAKED, &total_staked);
        let token_id: Address = s::get_persistent(&env, &KEY_TOKEN_ID, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        let pool_address = env.current_contract_address();
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.transfer(&pool_address, &user, &amount);
        e::publish(&env, (e::EVENT_UNSTAKE, &user), amount);
    }

    pub fn claim_reward(env: Env, user: Address) -> i128 {
        user.require_auth();
        let stake_key = StakeKey::Stake(user.clone());
        let mut existing_stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo { amount: 0, start_ledger: 0, reward_claimed: 0 });
        let pending = Self::calculate_reward(env.clone(), user.clone());
        let total_reward = existing_stake.reward_claimed + pending;
        if total_reward <= 0 { return 0; }
        existing_stake.reward_claimed = 0;
        existing_stake.start_ledger = env.ledger().sequence();
        env.storage().persistent().set(&stake_key, &existing_stake);
        e::publish(&env, (e::EVENT_REWARD, &user), total_reward);
        total_reward
    }

    pub fn calculate_reward(env: Env, user: Address) -> i128 {
        let config: PoolConfig = s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false });
        let stake_key = StakeKey::Stake(user.clone());
        let stake: StakeInfo = env.storage().persistent().get(&stake_key).unwrap_or(StakeInfo { amount: 0, start_ledger: 0, reward_claimed: 0 });
        if stake.amount == 0 || config.reward_rate == 0 { return 0; }
        let current_ledger = env.ledger().sequence();
        let elapsed = (current_ledger as i128) - (stake.start_ledger as i128);
        if elapsed <= 0 { return 0; }
        (stake.amount * config.reward_rate * elapsed) / 10_000_000i128
    }

    pub fn fund_rewards(env: Env, admin: Address, amount: i128) {
        let stored_admin: Address = s::get_persistent(&env, &s::KEY_ADMIN, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        if admin != stored_admin { panic!("Only admin"); }
        admin.require_auth();
        let mut reward_pool: i128 = s::get_persistent(&env, &KEY_REWARD_POOL, 0i128);
        reward_pool += amount;
        s::set_persistent(&env, &KEY_REWARD_POOL, &reward_pool);
    }

    pub fn set_active(env: Env, admin: Address, active: bool) {
        let stored_admin: Address = s::get_persistent(&env, &s::KEY_ADMIN, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        if admin != stored_admin { panic!("Only admin"); }
        admin.require_auth();
        let mut config: PoolConfig = s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false });
        config.active = active;
        s::set_persistent(&env, &KEY_POOL_CONFIG, &config);
        e::publish(&env, (symbol_short!("pool_act"), &admin), active);
    }

    pub fn get_stake(env: Env, user: Address) -> StakeInfo {
        let key = StakeKey::Stake(user);
        env.storage().persistent().get(&key).unwrap_or(StakeInfo { amount: 0, start_ledger: 0, reward_claimed: 0 })
    }

    pub fn get_token_id(env: Env) -> Address {
        s::get_persistent(&env, &KEY_TOKEN_ID, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")))
    }

    pub fn get_pool_config(env: Env) -> PoolConfig {
        s::get_persistent(&env, &KEY_POOL_CONFIG, PoolConfig { reward_rate: 0, min_stake: 0, max_stake: 0, lock_period: 0, active: false })
    }

    pub fn get_total_staked(env: Env) -> i128 {
        s::get_persistent(&env, &KEY_TOTAL_STAKED, 0i128)
    }
}

#[cfg(test)]
mod pool_test {
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger as _;
    use super::*;
    use soroban_sdk::Env;
    use crate::token::DripToken;

    #[test]
    fn test_stake_and_unstake() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let token_id = env.register(DripToken, ());
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.initialize_token(&admin, &String::from_str(&env, "DripToken"), &String::from_str(&env, "DRIP"), &7u32);
        token_client.mint(&admin, &user, &5000i128);
        let contract_id = env.register(DripPool, ());
        let client = DripPoolClient::new(&env, &contract_id);
        client.initialize_pool(&admin, &token_id, &100i128, &10i128, &100u32);
        token_client.approve(&user, &contract_id, &5000i128, &999999u32);
        client.stake(&user, &500i128);
        let stake = client.get_stake(&user);
        assert_eq!(stake.amount, 500i128);
        env.ledger().set_sequence_number(200);
        client.unstake(&user, &300i128);
        let stake2 = client.get_stake(&user);
        assert_eq!(stake2.amount, 200i128);
    }

    #[test]
    fn test_reward_calculation() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let token_id = env.register(DripToken, ());
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.initialize_token(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        token_client.mint(&admin, &user, &5000i128);
        let contract_id = env.register(DripPool, ());
        let client = DripPoolClient::new(&env, &contract_id);
        client.initialize_pool(&admin, &token_id, &1000i128, &10i128, &0u32);
        token_client.approve(&user, &contract_id, &5000i128, &999999u32);
        client.stake(&user, &1000i128);
        env.ledger().set_sequence_number(200);
        let reward = client.calculate_reward(&user);
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
// Calculates staking rewards based on amount × time × reward_rate

